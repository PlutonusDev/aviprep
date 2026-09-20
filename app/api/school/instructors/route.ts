import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { prisma } from "@lib/prisma"
import { instructorsOf, isResponse, requireSchool } from "@lib/school/access"
import { INVITE_TTL_DAYS, inviteBlockedBecause, inviteStatus, newInviteToken, notAccepted, notRevoked, sendInviteEmail } from "@lib/school/invites"

/**
 * Who can get into this school's panel.
 *   GET     everyone with access, plus invites that haven't been used yet
 *   POST    invite another instructor by email
 *   DELETE  remove one (the owner), or leave the school yourself
 */

export async function GET() {
  const access = await requireSchool()
  if (isResponse(access)) return access

  const [instructors, invites] = await Promise.all([
    instructorsOf(access.schoolId),
    prisma.schoolInvite.findMany({
      where: { flightSchoolId: access.schoolId, ...notAccepted, ...notRevoked },
      orderBy: { sentAt: "desc" },
      select: { id: true, email: true, firstName: true, lastName: true, sentAt: true, expiresAt: true, acceptedAt: true, revokedAt: true, invitedById: true },
    }),
  ])

  const inviters = await prisma.user.findMany({
    where: { id: { in: [...new Set(invites.map((i) => i.invitedById))] } },
    select: { id: true, firstName: true, lastName: true },
  })
  const byId = new Map(inviters.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]))

  return NextResponse.json({
    you: { id: access.userId, isOwner: access.isOwner },
    instructors,
    invites: invites.map((i) => ({
      id: i.id,
      email: i.email,
      firstName: i.firstName,
      lastName: i.lastName,
      sentAt: i.sentAt,
      expiresAt: i.expiresAt,
      status: inviteStatus(i),
      invitedBy: byId.get(i.invitedById) ?? null,
    })),
  })
}

export async function POST(request: Request) {
  const access = await requireSchool()
  if (isResponse(access)) return access

  const body = await request.json().catch(() => ({}))
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : ""
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : ""
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : ""

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "That doesn't look like an email address." }, { status: 422 })
  }

  const blocked = await inviteBlockedBecause(access.schoolId, email)
  if (blocked) return NextResponse.json({ error: blocked }, { status: 409 })

  const school = await prisma.flightSchool.findUnique({ where: { id: access.schoolId }, select: { name: true, logo: true } })
  const inviter = await prisma.user.findUnique({ where: { id: access.userId }, select: { firstName: true, lastName: true } })
  if (!school || !inviter) return NextResponse.json({ error: "Not authorized" }, { status: 403 })

  const { token, tokenHash, expiresAt } = newInviteToken()
  const invite = await prisma.schoolInvite.create({
    data: {
      flightSchoolId: access.schoolId,
      email,
      firstName: firstName || null,
      lastName: lastName || null,
      note: note || null,
      tokenHash,
      invitedById: access.userId,
      expiresAt,
    },
  })

  try {
    const host = (await headers()).get("host") ?? ""
    const origin = host.startsWith("localhost") || host.startsWith("127.") ? `http://${host}` : `https://${host}`
    await sendInviteEmail({
      invite,
      token,
      origin,
      school: { name: school.name, logo: school.logo },
      inviterName: `${inviter.firstName} ${inviter.lastName}`.trim(),
    })
  } catch (error) {
    // The invite exists but nobody knows: drop it rather than leave a dead row.
    await prisma.schoolInvite.delete({ where: { id: invite.id } })
    console.error("School invite email failed:", error)
    return NextResponse.json({ error: "The invite couldn't be emailed. Check the address and try again." }, { status: 502 })
  }

  return NextResponse.json({ id: invite.id, email, expiresAt, ttlDays: INVITE_TTL_DAYS })
}

export async function DELETE(request: Request) {
  const access = await requireSchool()
  if (isResponse(access)) return access

  const userId = new URL(request.url).searchParams.get("userId") ?? ""
  const school = await prisma.flightSchool.findUnique({ where: { id: access.schoolId }, select: { adminId: true, instructorIds: true } })
  if (!school) return NextResponse.json({ error: "Not authorized" }, { status: 403 })

  if (userId === school.adminId) {
    return NextResponse.json({ error: "The school's owner can't be removed." }, { status: 422 })
  }
  if (!school.instructorIds.includes(userId)) {
    return NextResponse.json({ error: "They don't have access to this school." }, { status: 404 })
  }
  // Anyone can leave; only the owner can remove someone else.
  if (userId !== access.userId && !access.isOwner) {
    return NextResponse.json({ error: "Only the school's owner can remove another instructor." }, { status: 403 })
  }

  await prisma.flightSchool.update({
    where: { id: access.schoolId },
    data: { instructorIds: { set: school.instructorIds.filter((id) => id !== userId) } },
  })
  // The badge comes off too, or they'd keep seeing a School link that 403s -
  // but only if this was their last school. Someone can run one and help at
  // another, and losing the second shouldn't lock them out of the first.
  const elsewhere = await prisma.flightSchool.findFirst({
    where: { OR: [{ adminId: userId }, { instructorIds: { has: userId } }] },
    select: { id: true },
  })
  if (!elsewhere) await prisma.user.update({ where: { id: userId }, data: { isFlightSchoolAdmin: false } })

  return NextResponse.json({ success: true, leftSchool: userId === access.userId })
}
