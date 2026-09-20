import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { isResponse, requireStaff } from "@lib/staff"
import { sendEmailPartnership } from "@lib/email"
import { getDemoInviteTemplate } from "@lib/email-demo-invite"
import { DEFAULT_TTL_DAYS, codeHint, demoOrigin, hashCode, newCode } from "@lib/demo/access"

/**
 *   POST    send a fresh code, which replaces the old one
 *   DELETE  revoke it
 */

async function find(grantId: string) {
  if (!/^[a-f0-9]{24}$/i.test(grantId)) return null
  return prisma.demoGrant.findUnique({ where: { id: grantId } })
}

export async function POST(_request: Request, { params }: { params: Promise<{ grantId: string }> }) {
  const staff = await requireStaff()
  if (isResponse(staff)) return staff

  const { grantId } = await params
  const grant = await find(grantId)
  if (!grant) return NextResponse.json({ error: "That invite no longer exists." }, { status: 404 })

  const sender = await prisma.user.findUnique({ where: { id: staff.userId }, select: { firstName: true, lastName: true } })
  const senderName = sender ? `${sender.firstName} ${sender.lastName}`.trim() : "AviPrep"

  // A new code every time, so an old email stops working.
  const code = newCode()
  const expiresAt = new Date(Date.now() + DEFAULT_TTL_DAYS * 86_400_000)
  await prisma.demoGrant.update({
    where: { id: grant.id },
    data: { codeHash: hashCode(code), codeHint: codeHint(code), expiresAt, sentAt: new Date(), sendCount: { increment: 1 }, revokedAt: null },
  })

  const origin = await demoOrigin()
  try {
    await sendEmailPartnership({
      to: grant.email,
      subject: `Your AviPrep demo for ${grant.organisation}`,
      html: getDemoInviteTemplate({
        contactName: grant.contactName,
        organisation: grant.organisation,
        code,
        url: `${origin}/demo/access?c=${encodeURIComponent(code)}`,
        expiresAt,
        senderName,
        note: grant.note,
      }),
    })
  } catch (error) {
    console.error("Demo invite resend failed:", error)
    return NextResponse.json({ error: "The email didn't send. Try again shortly." }, { status: 502 })
  }

  return NextResponse.json({ code, expiresAt })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ grantId: string }> }) {
  const staff = await requireStaff()
  if (isResponse(staff)) return staff

  const { grantId } = await params
  const grant = await find(grantId)
  if (!grant) return NextResponse.json({ error: "That invite no longer exists." }, { status: 404 })

  await prisma.demoGrant.update({ where: { id: grant.id }, data: { revokedAt: new Date() } })
  return NextResponse.json({ success: true })
}
