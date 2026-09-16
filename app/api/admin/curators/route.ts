import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { isResponse, requireStaff } from "@lib/staff"
import { australianMobile, isEmail } from "@lib/curators/details"
import { inviteStatus, newInviteToken, notAccepted, notRevoked, sendInviteEmail } from "@lib/curators/invites"
import { requestOrigin } from "@lib/email-verification"

const tidy = (value: unknown, max = 60) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "")

async function inviterName(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } })
  return user ? `${user.firstName} ${user.lastName}`.trim() : "The AviPrep team"
}

/** Curators and the invites that haven't turned into accounts yet. */
export async function GET() {
  const staff = await requireStaff()
  if (isResponse(staff)) return staff

  const [curators, invites] = await Promise.all([
    prisma.curator.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, credentials: true, isActive: true, lastLoginAt: true, createdAt: true },
    }),
    prisma.curatorInvite.findMany({ where: notAccepted, orderBy: { sentAt: "desc" } }),
  ])

  const ids = curators.map((c) => c.id)
  const questions = ids.length
    ? await prisma.question.groupBy({ by: ["authorId", "status"], where: { authorId: { in: ids } }, _count: { _all: true } })
    : []
  const counts = new Map<string, { total: number; live: number }>()
  for (const row of questions) {
    const entry = counts.get(row.authorId!) ?? { total: 0, live: 0 }
    entry.total += row._count._all
    if (row.status === "published" || row.status == null) entry.live += row._count._all
    counts.set(row.authorId!, entry)
  }

  return NextResponse.json({
    curators: curators.map((c) => ({ ...c, questions: counts.get(c.id) ?? { total: 0, live: 0 } })),
    invites: invites.map(({ tokenHash, ...invite }) => ({ ...invite, status: inviteStatus(invite) })),
  })
}

/** Invites someone: creates the invite and emails the link with the guidelines attached. */
export async function POST(request: Request) {
  const staff = await requireStaff()
  if (isResponse(staff)) return staff

  try {
    const body = await request.json().catch(() => ({}))
    const email = tidy(body.email, 254).toLowerCase()
    const firstName = tidy(body.firstName)
    const lastName = tidy(body.lastName)
    const phoneInput = tidy(body.phone, 20)
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 600) : ""

    const fields: Record<string, string> = {}
    if (!isEmail(email)) fields.email = "Enter a valid email address."
    const phone = phoneInput ? australianMobile(phoneInput) : null
    if (phoneInput && !phone) fields.phone = "Use an Australian mobile, starting 04, or leave it blank."
    if (Object.keys(fields).length) return NextResponse.json({ error: "Check the highlighted fields.", fields }, { status: 400 })

    const existing = await prisma.curator.findUnique({ where: { email }, select: { id: true } })
    if (existing) {
      return NextResponse.json({ error: "They already have a curator account.", fields: { email: "Already a curator." } }, { status: 409 })
    }

    const open = await prisma.curatorInvite.findFirst({
      where: { email, expiresAt: { gt: new Date() }, AND: [notAccepted, notRevoked] },
      select: { id: true },
    })
    if (open) {
      return NextResponse.json(
        { error: "They already have an invite waiting. You can resend it instead.", pendingInviteId: open.id },
        { status: 409 },
      )
    }

    const { token, tokenHash, expiresAt } = newInviteToken()
    const invite = await prisma.curatorInvite.create({
      data: {
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        phone,
        note: note || null,
        tokenHash,
        expiresAt,
        invitedById: staff.userId,
        // Written explicitly so null filters match (see notAccepted).
        acceptedAt: null,
        revokedAt: null,
      },
    })

    try {
      const sent = await sendInviteEmail({ invite, token, origin: requestOrigin(request), inviterName: await inviterName(staff.userId) })
      return NextResponse.json({ inviteId: invite.id, attachedGuidelines: sent.attachedGuidelines })
    } catch (error) {
      // No email went out, so don't leave an invite behind that says it did.
      await prisma.curatorInvite.delete({ where: { id: invite.id } })
      console.error("Curator invite email failed:", error)
      return NextResponse.json({ error: "The email didn't send. Nothing was created, so try again." }, { status: 502 })
    }
  } catch (error) {
    console.error("Curator invite error:", error)
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 })
  }
}
