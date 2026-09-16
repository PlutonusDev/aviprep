import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { isTrustedDevice, startSession, verifyPassword } from "@lib/auth"
import { sendOtp, signChallenge } from "@lib/otp"
import { maskPhone, toE164AustralianMobile } from "@lib/sms"

/**
 * Step 1 of sign-in. A correct password on a trusted device signs straight in;
 * otherwise a code is texted to the account's mobile and the client finishes at
 * /api/auth/login/verify.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body.password === "string" ? body.password : ""

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const session = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      arn: user.arn,
    }
    const signedIn = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
    })

    await startSession(session)
    return signedIn

    if (await isTrustedDevice(user.id, user.passwordHash)) {
      await startSession(session)
      return signedIn
    }

    const phone = toE164AustralianMobile(user.phone ?? "")
    if (!phone) {
      // Some older and school-created accounts have no usable mobile. Letting
      // them in on password alone is the lesser evil than locking them out;
      // they're prompted to add one when phone editing ships.
      console.warn(`Login without SMS code: user ${user.id} has no valid mobile`)
      await startSession(session)
      return signedIn
    }

    const key = `login:${user.id}`
    const sent = await sendOtp({ purpose: "login", key, phone })
    // Still inside the cooldown: a code was just sent, so go to the code step anyway.
    if (!sent.ok && sent.status !== 429) {
      return NextResponse.json({ error: sent.error }, { status: sent.status })
    }

    return NextResponse.json({
      otpRequired: true,
      challenge: await signChallenge({ purpose: "login", key, userId: user.id }),
      maskedPhone: maskPhone(phone),
      retryAfter: sent.ok ? 60 : sent.retryAfter,
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Something went wrong signing in. Try again." }, { status: 500 })
  }
}
