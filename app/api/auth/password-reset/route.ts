import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { hashPassword, verifyPassword } from "@lib/auth"
import { checkOtp, readChallenge, sendOtp, signChallenge } from "@lib/otp"
import { toE164AustralianMobile } from "@lib/sms"

const GENERIC = "If there's an account with that email, we've texted a code to its mobile."

/**
 * Forgot password.
 *   { email }                         -> texts a code if the account exists
 *   { challenge, code, password }     -> sets the new password
 *
 * The first step answers the same way whether or not the email exists, so it
 * can't be used to find out who has an account.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))

    if (body.challenge) {
      const challenge = await readChallenge(body.challenge, "reset")
      if (!challenge?.email) {
        return NextResponse.json({ error: "This reset has timed out. Start again.", restart: true }, { status: 400 })
      }

      const password = typeof body.password === "string" ? body.password : ""
      if (password.length < 8) {
        return NextResponse.json({ error: "Use at least 8 characters.", field: "password" }, { status: 400 })
      }

      // An email with no account never had a code issued, so this simply fails.
      const result = await checkOtp({ purpose: "reset", key: challenge.key, code: body.code })
      if (!result.ok) return NextResponse.json({ error: result.error, field: "code" }, { status: 400 })

      const user = await prisma.user.findUnique({ where: { email: challenge.email } })
      if (!user) return NextResponse.json({ error: "Account not found.", restart: true }, { status: 400 })
      if (await verifyPassword(password, user.passwordHash)) {
        return NextResponse.json({ error: "Choose a password you haven't used here.", field: "password" }, { status: 400 })
      }

      // The new hash also invalidates every trusted-device cookie for this account.
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } })
      return NextResponse.json({ success: true })
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address.", field: "email" }, { status: 400 })
    }

    // Identical token and response whether or not the email has an account.
    const key = `reset:${email}`
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, phone: true } })
    const phone = user ? toE164AustralianMobile(user.phone ?? "") : null

    if (user && phone) {
      const sent = await sendOtp({ purpose: "reset", key, phone })
      // A send failure is our problem, not theirs; limits stay silent so they don't reveal the account.
      if (!sent.ok && sent.status >= 500) {
        return NextResponse.json({ error: sent.error }, { status: sent.status })
      }
    } else if (user) {
      console.warn(`Password reset requested for user ${user.id} with no valid mobile`)
    }

    return NextResponse.json({ message: GENERIC, challenge: await signChallenge({ purpose: "reset", key, email }) })
  } catch (error) {
    console.error("Password reset error:", error)
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 })
  }
}
