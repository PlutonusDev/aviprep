import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { isResponse, requireStaff } from "@lib/staff"
import { sendEmailPartnership } from "@lib/email"
import { getDemoInviteTemplate } from "@lib/email-demo-invite"
import { DEFAULT_TTL_DAYS, codeHint, demoOrigin, grantStatus, hashCode, newCode } from "@lib/demo/access"

/**
 * Demo portal access.
 *   GET   every grant, newest first
 *   POST  create one and email the code
 */

export async function GET() {
  const staff = await requireStaff()
  if (isResponse(staff)) return staff

  const grants = await prisma.demoGrant.findMany({ orderBy: { sentAt: "desc" }, take: 200 })
  const inviters = await prisma.user.findMany({
    where: { id: { in: [...new Set(grants.map((g) => g.invitedById))] } },
    select: { id: true, firstName: true, lastName: true },
  })
  const byId = new Map(inviters.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]))

  return NextResponse.json({
    grants: grants.map((g) => ({
      id: g.id,
      organisation: g.organisation,
      contactName: g.contactName,
      email: g.email,
      codeHint: g.codeHint,
      note: g.note,
      status: grantStatus(g),
      sentAt: g.sentAt,
      sendCount: g.sendCount,
      expiresAt: g.expiresAt,
      firstOpenedAt: g.firstOpenedAt,
      lastOpenedAt: g.lastOpenedAt,
      opens: g.opens,
      sentBy: byId.get(g.invitedById) ?? null,
    })),
  })
}

export async function POST(request: Request) {
  const staff = await requireStaff()
  if (isResponse(staff)) return staff

  const body = await request.json().catch(() => ({}))
  const organisation = typeof body.organisation === "string" ? body.organisation.trim().slice(0, 160) : ""
  const contactName = typeof body.contactName === "string" ? body.contactName.trim().slice(0, 120) : ""
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : ""
  const days = Number.isFinite(body.days) ? Math.min(365, Math.max(1, Math.round(body.days))) : DEFAULT_TTL_DAYS

  if (!organisation) return NextResponse.json({ error: "Name the organisation." }, { status: 422 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "That isn't an email address." }, { status: 422 })

  const sender = await prisma.user.findUnique({ where: { id: staff.userId }, select: { firstName: true, lastName: true } })
  const senderName = sender ? `${sender.firstName} ${sender.lastName}`.trim() : "AviPrep"

  const code = newCode()
  const expiresAt = new Date(Date.now() + days * 86_400_000)
  const grant = await prisma.demoGrant.create({
    data: {
      organisation,
      contactName: contactName || null,
      email,
      codeHash: hashCode(code),
      codeHint: codeHint(code),
      note: note || null,
      invitedById: staff.userId,
      expiresAt,
    },
  })

  const origin = await demoOrigin()
  try {
    await sendEmailPartnership({
      to: email,
      subject: `Your AviPrep demo for ${organisation}`,
      html: getDemoInviteTemplate({
        contactName: contactName || null,
        organisation,
        code,
        url: `${origin}/demo/access?c=${encodeURIComponent(code)}`,
        expiresAt,
        senderName,
        note: note || null,
      }),
    })
  } catch (error) {
    // Nobody has the code, so the grant is dead on arrival.
    await prisma.demoGrant.delete({ where: { id: grant.id } })
    console.error("Demo invite email failed:", error)
    return NextResponse.json({ error: "The email didn't send. Check the address and try again." }, { status: 502 })
  }

  // Returned once so it can be read out over the phone; it isn't stored.
  return NextResponse.json({ id: grant.id, code, expiresAt })
}
