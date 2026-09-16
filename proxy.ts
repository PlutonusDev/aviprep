import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"
import { prisma } from "@lib/prisma"
import { CURATOR_SUBDOMAIN, getSubdomain, isAllowedSubdomain } from "@lib/tenant"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-min-32-chars-long!")

const protectedRoutes = ["/dashboard", "/checkout", "/m/dashboard", "/school", "/admin"]
const authRoutes = ["/login", "/register"]

/**
 * Marketing surfaces that belong to AviPrep itself. A school's subdomain is a
 * white-label product, so these must never render there - a student arriving at
 * koolardie.aviprep.com.au should see their school's sign-in, not our pitch.
 *
 * Legal pages and the PWA shell are deliberately absent: those stay reachable.
 */
const MARKETING_ONLY = ["/"]

/*
 * Subdomain lookups are cached in memory. Proxy runs before every matched
 * request, and Next's docs are explicit that it is not the place for slow data
 * fetching, so a database round trip per page view is not acceptable.
 *
 * Unknown subdomains expire quickly, so a newly created school starts working
 * within a minute rather than being stuck redirecting.
 */
const KNOWN_TTL_MS = 5 * 60 * 1000
const UNKNOWN_TTL_MS = 60 * 1000
const subdomainCache = new Map<string, { exists: boolean; expires: number }>()

async function schoolOwnsSubdomain(subdomain: string): Promise<boolean> {
  const cached = subdomainCache.get(subdomain)
  if (cached && cached.expires > Date.now()) return cached.exists

  try {
    const school = await prisma.flightSchool.findFirst({
      where: { subdomain, isActive: true },
      select: { id: true },
    })
    const exists = !!school
    subdomainCache.set(subdomain, {
      exists,
      expires: Date.now() + (exists ? KNOWN_TTL_MS : UNKNOWN_TTL_MS),
    })
    return exists
  } catch (error) {
    // Fail open and do not cache: a database hiccup must not bounce every real
    // school's students to the main site.
    console.error("Subdomain lookup failed:", error)
    return true
  }
}

/*
 * curators.aviprep.com.au: the content studio. Curator accounts only, with their
 * own cookie. Its sign-in and join pages live under app/curators and are served
 * here at /login and /join/<token>; the studio itself is the admin panel.
 */
const CURATOR_HOME = "/admin"
const CURATOR_PUBLIC = ["/terms", "/privacy"]

async function hasCuratorSession(request: NextRequest) {
  const token = request.cookies.get("curator_session")?.value
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload.kind === "curator-session"
  } catch {
    return false
  }
}

async function curatorProxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  // Static files (logos, uploads, the service worker) pass straight through.
  if (/\.[a-z0-9]+$/i.test(pathname)) return NextResponse.next()

  const signedIn = await hasCuratorSession(request)
  const to = (path: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone()
    url.pathname = path
    url.search = ""
    for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v)
    return url
  }

  if (pathname === "/") return NextResponse.redirect(to(signedIn ? CURATOR_HOME : "/login"))

  if (pathname === "/login") {
    if (signedIn) return NextResponse.redirect(to(CURATOR_HOME))
    const url = request.nextUrl.clone()
    url.pathname = "/curators/login"
    return NextResponse.rewrite(url)
  }

  if (pathname.startsWith("/join/")) {
    const url = request.nextUrl.clone()
    url.pathname = `/curators${pathname}`
    return NextResponse.rewrite(url)
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!signedIn) return NextResponse.redirect(to("/login", { redirect: pathname }))
    return NextResponse.next()
  }

  if (CURATOR_PUBLIC.includes(pathname)) return NextResponse.next()

  // Nothing else from the main site exists here.
  return NextResponse.redirect(to("/"))
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const host = request.headers.get("host") || ""
  const sessionToken = request.cookies.get("session")?.value

  const rawSubdomain = getSubdomain(host)

  if (rawSubdomain === CURATOR_SUBDOMAIN) return curatorProxy(request)

  // The curator pages are only reachable through the curators subdomain.
  if (pathname === "/curators" || pathname.startsWith("/curators/")) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    url.search = ""
    return NextResponse.redirect(url)
  }

  // An allowlisted subdomain behaves as the main site, not as a school portal.
  const allowlisted = rawSubdomain ? isAllowedSubdomain(rawSubdomain) : false

  // Nobody owns this subdomain: send the visitor to the same path on the main
  // site. The cross-host hop is delegated to /api/tenant/leave - a redirect to
  // the main host issued from here gets relativised by Next and loops (see that
  // route). This same-host hand-off is meant to be relative, so that is fine.
  if (rawSubdomain && !allowlisted && !(await schoolOwnsSubdomain(rawSubdomain))) {
    const leave = request.nextUrl.clone()
    leave.pathname = "/api/tenant/leave"
    leave.search = `?to=${encodeURIComponent(pathname + request.nextUrl.search)}`
    return NextResponse.redirect(leave, 307)
  }

  const subdomain = allowlisted ? null : rawSubdomain

  // Forward the tenant on the REQUEST, so server components and route handlers
  // can read it. Setting it on the response only told the browser.
  const requestHeaders = new Headers(request.headers)
  if (subdomain) requestHeaders.set("x-tenant-subdomain", subdomain)
  const next = () => NextResponse.next({ request: { headers: requestHeaders } })

  let isAuthenticated = false
  if (sessionToken) {
    try {
      await jwtVerify(sessionToken, JWT_SECRET)
      isAuthenticated = true
    } catch {
      isAuthenticated = false
    }
  }

  // A tenant subdomain has no marketing site. Send visitors straight where they
  // were going: their dashboard if signed in, otherwise their school's login.
  if (subdomain && MARKETING_ONLY.includes(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = isAuthenticated ? "/dashboard" : "/login"
    url.search = ""
    return NextResponse.redirect(url)
  }

  // The installed app starts at /m. Signed in: straight to the dashboard.
  if (isAuthenticated && (pathname === "/m" || pathname === "/m/login")) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    url.search = ""
    return NextResponse.redirect(url)
  }

  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      const url = request.nextUrl.clone()
      url.pathname = pathname.startsWith("/m/") ? "/m/login" : "/login"
      url.searchParams.set("redirect", pathname)
      return NextResponse.redirect(url)
    }
  }

  if (authRoutes.some((route) => pathname.startsWith(route))) {
    if (isAuthenticated) {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }
  }

  return next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/school/:path*",
    "/admin/:path*",
    "/login",
    "/register",
    // Everything else, so subdomain detection and the redirects apply.
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
