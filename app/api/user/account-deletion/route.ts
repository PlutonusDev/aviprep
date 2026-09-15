import { NextResponse } from "next/server"
import { getSession } from "@lib/auth"
import { prisma } from "@lib/prisma"
import { sendEmailSupport } from "@lib/email"
import { checkOtp, readChallenge, sendOtp, signChallenge } from "@lib/otp"
import { maskPhone, toE164AustralianMobile } from "@lib/sms"

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

/**
 * Account closure request, confirmed by SMS so a stolen session alone can't
 * trigger it.
 *   GET                         -> whether a request is already pending
 *   POST {}                     -> texts a code
 *   POST { challenge, code }    -> records the request and emails support
 */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { deletionRequestedAt: true } })
  return NextResponse.json({ requestedAt: user?.deletionRequestedAt ?? null })
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, email: true, firstName: true, lastName: true, arn: true, phone: true, deletionRequestedAt: true },
    })
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.deletionRequestedAt) {
      return NextResponse.json({ requestedAt: user.deletionRequestedAt })
    }

    const body = await request.json().catch(() => ({}))

    if (body.challenge) {
      const challenge = await readChallenge(body.challenge, "delete")
      if (!challenge || challenge.userId !== user.id) {
        return NextResponse.json({ error: "This has timed out. Send a new code.", restart: true }, { status: 400 })
      }
      const result = await checkOtp({ purpose: "delete", key: challenge.key, code: body.code })
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

      const requestedAt = new Date()
      await prisma.user.update({ where: { id: user.id }, data: { deletionRequestedAt: requestedAt } })

      const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : ""
      await sendEmailSupport({
        to: "support@aviprep.com.au",
        subject: `Account closure request: ${user.firstName} ${user.lastName}`,
        html: `<p>A member confirmed an account closure request by SMS.</p>
<ul>
<li>Name: ${escape(`${user.firstName} ${user.lastName}`)}</li>
<li>Email: ${escape(user.email)}</li>
<li>ARN: ${escape(user.arn)}</li>
<li>User ID: ${user.id}</li>
<li>Requested: ${requestedAt.toISOString()}</li>
</ul>
${reason ? `<p>Reason given:</p><blockquote>${escape(reason)}</blockquote>` : "<p>No reason given.</p>"}`,
      }).catch((err) => console.error("Closure request email failed:", err))

      return NextResponse.json({ requestedAt })
    }

    const phone = toE164AustralianMobile(user.phone ?? "")
    if (!phone) {
      return NextResponse.json(
        { error: "There's no mobile on your account to confirm with. Email support@aviprep.com.au." },
        { status: 400 },
      )
    }

    const key = `delete:${user.id}`
    const sent = await sendOtp({ purpose: "delete", key, phone })
    if (!sent.ok && sent.status !== 429) return NextResponse.json({ error: sent.error }, { status: sent.status })

    return NextResponse.json({
      challenge: await signChallenge({ purpose: "delete", key, userId: user.id }),
      maskedPhone: maskPhone(phone),
      retryAfter: sent.ok ? 60 : sent.retryAfter,
    })
  } catch (error) {
    console.error("Account deletion request error:", error)
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 })
  }
}
