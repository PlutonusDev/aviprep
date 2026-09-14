import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"
import { prisma } from "@lib/prisma"
import { getSubdomain, isAllowedSubdomain } from "@lib/tenant"

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

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const host = request.headers.get("host") || ""
  const sessionToken = request.cookies.get("session")?.value
  const isPwa = request.cookies.get("pwa")
  const isPwaForce = searchParams.get("force-pwa") === "true"

  const rawSubdomain = getSubdomain(host)

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

  if ((isPwa && !pathname.startsWith("/m")) || isPwaForce) {
    return NextResponse.redirect(new URL(`/m${pathname}`, request.url))
  }

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

  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
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
