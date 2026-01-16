import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-min-32-chars-long!")

const protectedRoutes = ["/dashboard", "/checkout"] // Added /dashboard to match your config
const authRoutes = ["/login", "/register"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionToken = request.cookies.get("session")?.value

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

  return NextResponse.next()
}

// Ensure the matcher covers all routes used in your logic
export const config = {
  matcher: [
    "/dashboard/:path*", 
    "/login", 
    "/register"
  ],
}