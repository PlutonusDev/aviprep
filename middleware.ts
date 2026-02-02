import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-min-32-chars-long!")

const protectedRoutes = ["/dashboard", "/checkout", "/m/dashboard"] // Added /dashboard to match your config
const authRoutes = ["/login", "/register"]

const mainDomains = [
  "aviprep.com.au",
  "www.aviprep.com.au"
]

function getSubdomain(host: string): string | null {
  const hostWithoutPort = host.split(":")[0];
  if(mainDomains.some(d => hostWithoutPort === d || hostWithoutPort.endsWith(`.${d}`))) {
    const domainMatch = hostWithoutPort.match(/^([^.]+)\.aviprep\.com\.au$/)
    if(domainMatch && domainMatch[1] !== "www") {
      return domainMatch[1];
    }

    const aviprepMatch = hostWithoutPort.match(/^([^.]+)\.aviprep\.com\.au$/)
    if(aviprepMatch) {
      return aviprepMatch[1];
    }
  } else {
    return null
  }

  // custom domain perhaps?
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const host = request.headers.get("host") || ""
  const sessionToken = request.cookies.get("session")?.value
  const isPwa = request.cookies.get('pwa')
  const isPwaForce = searchParams.get('force-pwa') === 'true'

  const subdomain = getSubdomain(host)

  const response = NextResponse.next()
  if(subdomain) response.headers.set("x-tenant-subdomain", subdomain)

  if (isPwa && !pathname.startsWith('/m') || isPwaForce) return NextResponse.redirect(new URL(`/m${pathname}`, request.url))

  let isAuthenticated = false

  if (sessionToken) {
    try {
      await jwtVerify(sessionToken, JWT_SECRET)
      isAuthenticated = true
    } catch {
      isAuthenticated = false
    }
  }

  // 1. Redirect unauthenticated users away from protected routes
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      url.searchParams.set("redirect", pathname)
      return NextResponse.redirect(url)
    }
  }

  // 2. Redirect authenticated users away from auth routes (login/register)
  if (authRoutes.some((route) => pathname.startsWith(route))) {
    if (isAuthenticated) {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard" // or "/dashboard"
      return NextResponse.redirect(url)
    }
  }

  if(subdomain) return response;

  return NextResponse.next()
}

// Ensure the matcher covers all routes used in your logic
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/school/:path*", 
    "/login", 
    "/register",
    // Match all paths for subdomain detection
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}