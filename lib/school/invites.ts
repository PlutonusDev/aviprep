import "server-only"

import { createHash, randomBytes } from "crypto"
import { prisma } from "@lib/prisma"
import { sendEmailWelcome } from "@lib/email"
import { getSchoolInviteTemplate } from "@lib/email-school-invite"

/**
 * Inviting another instructor into a school's panel.
 *
 * Built the same way as lib/curators/invites.ts: the link token is random, only
 * its SHA-256 lives in the database, and it expires. Anyone already in the
 * school can send one - a school with one instructor on leave shouldn't lose
 * access to its own students.
 */

export const INVITE_TTL_DAYS = 14

export type InviteStatus = "pending" | "expired" | "accepted" | "revoked"

/* On MongoDB `field: null` doesn't match a field that was never written. */
export const notAccepted = { OR: [{ acceptedAt: null }, { acceptedAt: { isSet: false } }] }
export const notRevoked = { OR: [{ revokedAt: null }, { revokedAt: { isSet: false } }] }

export const INVITE_UNAVAILABLE = {
  expired: "This invite has expired. Ask the school to send another one.",
  accepted: "This invite has already been used. Sign in instead.",
  revoked: "This invite is no longer active.",
} as const

export const hashInviteToken = (token: string) => createHash("sha256").update(token).digest("hex")

export function inviteStatus(invite: { expiresAt: Date; acceptedAt: Date | null; revokedAt: Date | null }): InviteStatus {
  if (invite.acceptedAt) return "accepted"
  if (invite.revokedAt) return "revoked"
  if (invite.expiresAt.getTime() < Date.now()) return "expired"
  return "pending"
}

export function newInviteToken() {
  const token = randomBytes(32).toString("base64url")
  return { token, tokenHash: hashInviteToken(token), expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000) }
}

export async function findInvite(token: unknown) {
  if (typeof token !== "string" || token.length < 20 || token.length > 100) return null
  const invite = await prisma.schoolInvite.findUnique({ where: { tokenHash: hashInviteToken(token) } })
  return invite ? { invite, status: inviteStatus(invite) } : null
}

/**
 * Why this address can't be invited, or null. Keeps the two ways in - a brand
 * new account and an existing one - from quietly conflicting with each other.
 */
export async function inviteBlockedBecause(schoolId: string, email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, flightSchoolId: true, isFlightSchoolAdmin: true },
  })

  if (user) {
    const school = await prisma.flightSchool.findUnique({ where: { id: schoolId }, select: { adminId: true, instructorIds: true } })
    if (school && (school.adminId === user.id || school.instructorIds.includes(user.id))) {
      return "They already have access to this school."
    }
    if (user.flightSchoolId && user.flightSchoolId !== schoolId) return "That account is a student at another school."
    if (user.isFlightSchoolAdmin) return "That account already runs another school."
  }

  const open = await prisma.schoolInvite.findFirst({
    where: { flightSchoolId: schoolId, email, ...notAccepted, ...notRevoked, expiresAt: { gt: new Date() } },
    select: { id: true },
  })
  if (open) return "They already have an invite waiting. Resend it instead."

  return null
}

export async function sendInviteEmail({
  invite,
  token,
  origin,
  school,
  inviterName,
}: {
  invite: { email: string; firstName: string | null; note: string | null; expiresAt: Date }
  token: string
  origin: string
  school: { name: string; logo: string | null }
  inviterName: string
}) {
  const joinUrl = `${origin}/school/join/${token}`

  await sendEmailWelcome({
    to: invite.email,
    subject: `${inviterName} invited you to ${school.name} on AviPrep`,
    html: getSchoolInviteTemplate({
      firstName: invite.firstName,
      schoolName: school.name,
      schoolLogo: school.logo,
      inviterName,
      note: invite.note,
      joinUrl,
      expiresAt: invite.expiresAt,
    }),
  })
}

/**
 * Puts the user into the school and closes the invite. Written as one step so
 * a half-accepted invite can't leave someone with a badge and no school.
 */
export async function acceptInvite(inviteId: string, schoolId: string, userId: string) {
  await prisma.flightSchool.update({
    where: { id: schoolId },
    data: { instructorIds: { push: userId } },
  })
  await prisma.user.update({ where: { id: userId }, data: { isFlightSchoolAdmin: true } })
  await prisma.schoolInvite.update({ where: { id: inviteId }, data: { acceptedAt: new Date(), userId } })
}
