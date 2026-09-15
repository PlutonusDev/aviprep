import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { checkOtp, readChallenge, sendOtp, signChallenge, signPhoneProof } from "@lib/otp"
import { maskPhone, toE164AustralianMobile } from "@lib/sms"
import { REGISTRATION_CLOSED_ERROR, getRegistrationSetting } from "@lib/site-settings"

/**
 * Sign-up phone verification.
 *   { email, phone }            -> texts a code, returns a challenge
 *   { challenge, code }         -> checks it, returns a phone proof for /register
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))

    // No sign-up texts (or SMS costs) while registrations are closed.
    if (!(await getRegistrationSetting()).open) {
      return NextResponse.json({ error: REGISTRATION_CLOSED_ERROR, closed: true }, { status: 403 })
    }

    if (body.challenge) {
      const challenge = await readChallenge(body.challenge, "signup")
      if (!challenge) return NextResponse.json({ error: "This code has expired. Send a new one." }, { status: 400 })

      const result = await checkOtp({ purpose: "signup", key: challenge.key, code: body.code })
      if (!result.ok) return NextResponse.json({ error: result.error, field: "code" }, { status: 400 })

      if (!challenge.phone) return NextResponse.json({ error: "Start again." }, { status: 400 })
      return NextResponse.json({ phoneProof: await signPhoneProof(challenge.phone) })
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const phone = toE164AustralianMobile(typeof body.phone === "string" ? body.phone : "")
    if (!phone) {
      return NextResponse.json({ error: "Enter an Australian mobile, starting 04.", field: "phone" }, { status: 400 })
    }

    // Catch a taken email before spending an SMS on a sign-up that can't finish.
    // /register reports this too, so it reveals nothing new.
    if (email && (await prisma.user.findUnique({ where: { email }, select: { id: true } }))) {
      return NextResponse.json({ error: "An account with this email already exists.", field: "email" }, { status: 400 })
    }

    const key = `signup:${phone}`
    const sent = await sendOtp({ purpose: "signup", key, phone })
    if (!sent.ok) {
      return NextResponse.json({ error: sent.error, retryAfter: sent.retryAfter }, { status: sent.status })
    }

    return NextResponse.json({
      challenge: await signChallenge({ purpose: "signup", key, phone }),
      maskedPhone: maskPhone(phone),
    })
  } catch (error) {
    console.error("Sign-up OTP error:", error)
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 })
  }
}
