import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { prisma } from "@lib/prisma"
import { isResponse, requireSchool } from "@lib/school/access"
import { newInviteToken, sendInviteEmail } from "@lib/school/invites"

/** Resend an instructor invite with a fresh link, or revoke it. */

async function inviteFor(schoolId: string, inviteId: string) {
  if (!/^[a-f0-9]{24}$/i.test(inviteId)) return null
  return prisma.schoolInvite.findFirst({ where: { id: inviteId, flightSchoolId: schoolId } })
}

export async function POST(_request: Request, { params }: { params: Promise<{ inviteId: string }> }) {
  const access = await requireSchool()
  if (isResponse(access)) return access

  const { inviteId } = await params
  const invite = await inviteFor(access.schoolId, inviteId)
  if (!invite) return NextResponse.json({ error: "That invite no longer exists." }, { status: 404 })
  if (invite.acceptedAt) return NextResponse.json({ error: "They've already joined." }, { status: 409 })

  const [school, inviter] = await Promise.all([
    prisma.flightSchool.findUnique({ where: { id: access.schoolId }, select: { name: true, logo: true } }),
    prisma.user.findUnique({ where: { id: access.userId }, select: { firstName: true, lastName: true } }),
  ])
  if (!school || !inviter) return NextResponse.json({ error: "Not authorized" }, { status: 403 })

  // A resend replaces the link, so an old email can't be used later.
  const { token, tokenHash, expiresAt } = newInviteToken()
  const updated = await prisma.schoolInvite.update({
    where: { id: invite.id },
    data: { tokenHash, expiresAt, sentAt: new Date(), sendCount: { increment: 1 }, revokedAt: null },
  })

  try {
    const host = (await headers()).get("host") ?? ""
    const origin = host.startsWith("localhost") || host.startsWith("127.") ? `http://${host}` : `https://${host}`
    await sendInviteEmail({
      invite: updated,
      token,
      origin,
      school: { name: school.name, logo: school.logo },
      inviterName: `${inviter.firstName} ${inviter.lastName}`.trim(),
    })
  } catch (error) {
    console.error("School invite resend failed:", error)
    return NextResponse.json({ error: "The invite couldn't be emailed. Try again shortly." }, { status: 502 })
  }

  return NextResponse.json({ success: true, expiresAt })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ inviteId: string }> }) {
  const access = await requireSchool()
  if (isResponse(access)) return access

  const { inviteId } = await params
  const invite = await inviteFor(access.schoolId, inviteId)
  if (!invite) return NextResponse.json({ error: "That invite no longer exists." }, { status: 404 })
  if (invite.acceptedAt) return NextResponse.json({ error: "They've already joined. Remove them instead." }, { status: 409 })

  await prisma.schoolInvite.update({ where: { id: invite.id }, data: { revokedAt: new Date() } })
  return NextResponse.json({ success: true })
}
