import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { verifyPassword } from "@lib/auth"
import { sendOtp, signChallenge } from "@lib/otp"
import { maskPhone } from "@lib/sms"
import { isCuratorHost } from "@lib/tenant"

/**
 * Curator sign-in, step 1. There's no trusted-device shortcut: every sign-in
 * texts a code, and the client finishes at /api/curators/login/verify.
 */
export async function POST(request: Request) {
  if (!isCuratorHost(request.headers.get("host") ?? "")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body.password === "string" ? body.password : ""
    if (!email || !password) {
      return NextResponse.json({ error: "Enter your email and password." }, { status: 400 })
    }

    const curator = await prisma.curator.findUnique({ where: { email } })
    if (!curator || !(await verifyPassword(password, curator.passwordHash))) {
      return NextResponse.json({ error: "That email and password don't match." }, { status: 401 })
    }
    if (!curator.isActive) {
      return NextResponse.json(
        { error: "This account has been switched off. Get in touch with the AviPrep team if that's a mistake." },
        { status: 403 },
      )
    }

    const key = `curator-login:${curator.id}`
    const sent = await sendOtp({ purpose: "curator-login", key, phone: curator.phone })
    // Inside the cooldown a code was only just sent, so carry on to the code step.
    if (!sent.ok && sent.status !== 429) {
      return NextResponse.json({ error: sent.error }, { status: sent.status })
    }

    return NextResponse.json({
      challenge: await signChallenge({ purpose: "curator-login", key, userId: curator.id }),
      maskedPhone: maskPhone(curator.phone),
      retryAfter: sent.ok ? 60 : sent.retryAfter,
    })
  } catch (error) {
    console.error("Curator login error:", error)
    return NextResponse.json({ error: "Something went wrong signing in. Try again." }, { status: 500 })
  }
}
