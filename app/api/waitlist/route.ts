import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { sendEmailWelcome } from "@lib/email"
import { getWaitlistTemplate } from "@lib/email-templates"
import { checkOtp, readChallenge, sendOtp, signChallenge } from "@lib/otp"
import { maskPhone, toE164AustralianMobile } from "@lib/sms"

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function verifyRecaptcha(token: unknown) {
  if (typeof token !== "string" || !token) return false
  try {
    const res = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${encodeURIComponent(token)}`,
      { method: "POST" },
    )
    const data = await res.json()
    return !!data.success && data.score >= 0.5
  } catch {
    return false
  }
}

/**
 * Join the waitlist in two steps, with the mobile confirmed by SMS:
 *   { email, phone, token }  -> checks reCAPTCHA, texts a code, returns a challenge
 *   { challenge, code }      -> confirms the code and adds them to the list
 *
 * reCAPTCHA guards the step that costs an SMS; the code guards the second.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))

    if (body.challenge) {
      const challenge = await readChallenge(body.challenge, "waitlist")
      if (!challenge?.email || !challenge.phone) {
        return NextResponse.json({ error: "This has timed out. Start again.", restart: true }, { status: 400 })
      }

      const result = await checkOtp({ purpose: "waitlist", key: challenge.key, code: body.code })
      if (!result.ok) return NextResponse.json({ error: result.error, field: "code" }, { status: 400 })

      const existing = await prisma.waitlist.findUnique({ where: { email: challenge.email } })
      if (existing) {
        await prisma.waitlist.update({
          where: { email: challenge.email },
          data: { phone: challenge.phone, phoneVerifiedAt: new Date() },
        })
      } else {
        await prisma.waitlist.create({
          data: { email: challenge.email, phone: challenge.phone, phoneVerifiedAt: new Date() },
        })
        sendEmailWelcome({
          to: challenge.email,
          subject: "You're on the AviPrep waitlist",
          html: getWaitlistTemplate(challenge.email),
        }).catch((err) => console.error("Waitlist welcome email failed:", err))
      }

      return NextResponse.json({ success: true })
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    if (!EMAIL.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address.", field: "email" }, { status: 400 })
    }
    const phone = toE164AustralianMobile(typeof body.phone === "string" ? body.phone : "")
    if (!phone) {
      return NextResponse.json({ error: "Enter an Australian mobile, starting 04.", field: "phone" }, { status: 400 })
    }

    if (!(await verifyRecaptcha(body.token))) {
      return NextResponse.json({ error: "We couldn't verify you're human. Refresh and try again." }, { status: 400 })
    }

    // Already confirmed: say so without spending a text.
    const existing = await prisma.waitlist.findUnique({ where: { email }, select: { phoneVerifiedAt: true } })
    if (existing?.phoneVerifiedAt) {
      return NextResponse.json({ error: "This email is already on the waitlist.", field: "email" }, { status: 400 })
    }

    const key = `waitlist:${phone}`
    const sent = await sendOtp({ purpose: "waitlist", key, phone })
    if (!sent.ok) {
      return NextResponse.json({ error: sent.error, retryAfter: sent.retryAfter }, { status: sent.status })
    }

    return NextResponse.json({
      challenge: await signChallenge({ purpose: "waitlist", key, phone, email }),
      maskedPhone: maskPhone(phone),
    })
  } catch (error) {
    console.error("Waitlist signup error:", error)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
