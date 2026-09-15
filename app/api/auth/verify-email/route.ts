import { NextResponse } from "next/server"
import { getSession } from "@lib/auth"
import { prisma } from "@lib/prisma"
import { RESEND_COOLDOWN_MS, readEmailToken, requestOrigin, sendVerificationEmail } from "@lib/email-verification"

/**
 * GET  ?token=  - the link in the email. Confirms, then lands on the dashboard.
 * POST          - resend the email for the signed-in member.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const done = (status: "verified" | "expired") =>
    NextResponse.redirect(new URL(`/dashboard?email=${status}`, requestOrigin(request)))

  try {
    const claim = await readEmailToken(url.searchParams.get("token"))
    if (!claim) return done("expired")

    const user = await prisma.user.findUnique({
      where: { id: claim.userId },
      select: { email: true, emailVerifiedAt: true },
    })
    // The address changed since the link was sent: it no longer proves anything.
    if (!user || user.email !== claim.email) return done("expired")

    if (!user.emailVerifiedAt) {
      await prisma.user.update({ where: { id: claim.userId }, data: { emailVerifiedAt: new Date() } })
    }
    // Opened on a device where they aren't signed in (e.g. their phone's mail app):
    // the dashboard would bounce them to login and drop the flag, so go there directly.
    if (!(await getSession())) {
      return NextResponse.redirect(new URL("/login?email=verified", requestOrigin(request)))
    }
    return done("verified")
  } catch (error) {
    console.error("Email verification error:", error)
    return done("expired")
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, email: true, firstName: true, emailVerifiedAt: true, emailVerificationSentAt: true },
    })
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.emailVerifiedAt) return NextResponse.json({ verified: true })

    const since = user.emailVerificationSentAt ? Date.now() - user.emailVerificationSentAt.getTime() : Infinity
    if (since < RESEND_COOLDOWN_MS) {
      const retryAfter = Math.ceil((RESEND_COOLDOWN_MS - since) / 1000)
      return NextResponse.json({ error: `Wait ${retryAfter}s before sending another.`, retryAfter }, { status: 429 })
    }

    await sendVerificationEmail({ user, origin: requestOrigin(request) })
    return NextResponse.json({ sent: true, retryAfter: RESEND_COOLDOWN_MS / 1000 })
  } catch (error) {
    console.error("Resend verification error:", error)
    return NextResponse.json({ error: "Couldn't send the email. Try again shortly." }, { status: 500 })
  }
}
