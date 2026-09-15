import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { startSession, trustThisDevice } from "@lib/auth"
import { checkOtp, readChallenge } from "@lib/otp"

/** Step 2 of sign-in: the texted code. */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const challenge = await readChallenge(body.challenge, "login")
    if (!challenge?.userId) {
      return NextResponse.json({ error: "This sign-in has timed out. Start again.", restart: true }, { status: 400 })
    }

    const result = await checkOtp({ purpose: "login", key: challenge.key, code: body.code })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { id: challenge.userId } })
    if (!user) return NextResponse.json({ error: "Account not found.", restart: true }, { status: 400 })

    await startSession({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      arn: user.arn,
    })
    if (body.remember) await trustThisDevice(user.id, user.passwordHash)

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
    })
  } catch (error) {
    console.error("Login verify error:", error)
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 })
  }
}
