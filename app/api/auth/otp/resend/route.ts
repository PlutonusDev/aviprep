import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { readChallenge, sendOtp } from "@lib/otp"
import { toE164AustralianMobile } from "@lib/sms"

/** Sends a fresh code for any in-progress challenge. Limits live in sendOtp. */
export async function POST(request: Request) {
  try {
    const { challenge: token } = await request.json().catch(() => ({}))
    const challenge = await readChallenge(token)
    if (!challenge) {
      return NextResponse.json({ error: "This has timed out. Start again.", restart: true }, { status: 400 })
    }

    // The phone is never in the token (except sign-up), so look it up again.
    let phone: string | null = null
    if (challenge.purpose === "signup") {
      phone = challenge.phone ?? null
    } else {
      const where = challenge.userId ? { id: challenge.userId } : challenge.email ? { email: challenge.email } : null
      const user = where ? await prisma.user.findUnique({ where, select: { phone: true } }) : null
      phone = user ? toE164AustralianMobile(user.phone ?? "") : null
    }

    // A password reset for an unknown email: answer as if a code was sent,
    // so resend can't be used to test which emails have accounts.
    if (!phone) return NextResponse.json({ ok: true })

    const sent = await sendOtp({ purpose: challenge.purpose, key: challenge.key, phone })
    if (!sent.ok) {
      if (challenge.purpose === "reset" && sent.status < 500) return NextResponse.json({ ok: true })
      return NextResponse.json({ error: sent.error, retryAfter: sent.retryAfter }, { status: sent.status })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("OTP resend error:", error)
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 })
  }
}
