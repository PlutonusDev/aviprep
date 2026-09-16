import "server-only"

import { createHash, randomBytes } from "crypto"
import { readFile } from "fs/promises"
import path from "path"
import { prisma } from "@lib/prisma"
import { sendEmailPartnership } from "@lib/email"
import { getCuratorInviteTemplate } from "@lib/email-curator-invite"
import { curatorOriginFor } from "@lib/tenant"

export const INVITE_TTL_DAYS = 7

/** Shipped with the invite. Rebuild it from docs/contractors/source when the guide changes. */
export const GUIDELINES_FILE = path.join(/*turbopackIgnore: true*/ process.cwd(), "docs", "contractors", "AviPrep-Content-Guidelines.pdf")
export const GUIDELINES_NAME = "AviPrep-Content-Guidelines.pdf"

export type InviteStatus = "pending" | "expired" | "accepted" | "revoked"

/*
 * On MongoDB, `field: null` doesn't match a field that was never written, so
 * "not accepted" and "not revoked" have to allow for both.
 */
export const notAccepted = { OR: [{ acceptedAt: null }, { acceptedAt: { isSet: false } }] }
export const notRevoked = { OR: [{ revokedAt: null }, { revokedAt: { isSet: false } }] }

export const INVITE_UNAVAILABLE = {
  expired: "This invite has expired. Ask the AviPrep team to send a new one.",
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

/** A new link token and its stored hash. The token itself is only ever emailed. */
export function newInviteToken() {
  const token = randomBytes(32).toString("base64url")
  return { token, tokenHash: hashInviteToken(token), expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000) }
}

export async function findInvite(token: unknown) {
  if (typeof token !== "string" || token.length < 20 || token.length > 100) return null
  const invite = await prisma.curatorInvite.findUnique({ where: { tokenHash: hashInviteToken(token) } })
  return invite ? { invite, status: inviteStatus(invite) } : null
}

export async function readGuidelines(): Promise<Buffer | null> {
  try {
    return await readFile(/*turbopackIgnore: true*/ GUIDELINES_FILE)
  } catch (error) {
    console.error("Content guidelines PDF not found:", GUIDELINES_FILE, error)
    return null
  }
}

/**
 * Emails the invite with the content guidelines attached.
 * Returns whether the guide made it in, so the admin can be told if it didn't.
 */
export async function sendInviteEmail({
  invite,
  token,
  origin,
  inviterName,
}: {
  invite: { email: string; firstName: string | null; note: string | null; expiresAt: Date }
  token: string
  origin: string
  inviterName: string
}) {
  const joinUrl = `${curatorOriginFor(origin)}/join/${token}`
  const guidelines = await readGuidelines()

  await sendEmailPartnership({
    to: invite.email,
    subject: "You're invited to write for AviPrep",
    html: getCuratorInviteTemplate({
      firstName: invite.firstName,
      inviterName,
      note: invite.note,
      joinUrl,
      expiresAt: invite.expiresAt,
      hasGuidelines: !!guidelines,
    }),
    text: [
      `Hi${invite.firstName ? ` ${invite.firstName}` : ""},`,
      "",
      `${inviterName} has invited you to join AviPrep as a content curator.`,
      invite.note ? `\n"${invite.note}"\n` : "",
      `Set up your account: ${joinUrl}`,
      "",
      `The link works until ${invite.expiresAt.toLocaleDateString("en-AU", { day: "numeric", month: "long" })}.`,
      guidelines ? "Our content guidelines are attached. Have a read before you start writing." : "",
    ]
      .filter((line) => line !== "")
      .join("\n"),
    attachments: guidelines ? [{ filename: GUIDELINES_NAME, content: guidelines, contentType: "application/pdf" }] : undefined,
  })

  return { attachedGuidelines: !!guidelines, joinUrl }
}
