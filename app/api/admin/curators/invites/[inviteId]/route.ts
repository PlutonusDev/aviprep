import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { isResponse, requireStaff } from "@lib/staff"
import { inviteStatus, newInviteToken, sendInviteEmail } from "@lib/curators/invites"
import { requestOrigin } from "@lib/email-verification"

/**
 * { action: "resend" } issues a fresh link (the old one stops working) and a
 *                      new 7-day window, for pending or expired invites.
 * { action: "revoke" } stops the link working.
 */
export async function POST(request: Request, { params }: { params: Promise<{ inviteId: string }> }) {
  const staff = await requireStaff()
  if (isResponse(staff)) return staff

  try {
    const { inviteId } = await params
    const body = await request.json().catch(() => ({}))
    const invite = await prisma.curatorInvite.findUnique({ where: { id: inviteId } })
    if (!invite) return NextResponse.json({ error: "Invite not found." }, { status: 404 })

    const status = inviteStatus(invite)
    if (status === "accepted") return NextResponse.json({ error: "They've already joined." }, { status: 409 })

    if (body.action === "revoke") {
      if (status !== "revoked") await prisma.curatorInvite.update({ where: { id: invite.id }, data: { revokedAt: new Date() } })
      return NextResponse.json({ ok: true })
    }

    if (body.action === "resend") {
      if (await prisma.curator.findUnique({ where: { email: invite.email }, select: { id: true } })) {
        return NextResponse.json({ error: "They already have a curator account." }, { status: 409 })
      }

      const { token, tokenHash, expiresAt } = newInviteToken()
      const previous = { tokenHash: invite.tokenHash, expiresAt: invite.expiresAt, revokedAt: invite.revokedAt, sentAt: invite.sentAt }
      const updated = await prisma.curatorInvite.update({
        where: { id: invite.id },
        data: { tokenHash, expiresAt, revokedAt: null, sentAt: new Date(), sendCount: { increment: 1 } },
      })

      try {
        const inviter = await prisma.user.findUnique({ where: { id: staff.userId }, select: { firstName: true, lastName: true } })
        const sent = await sendInviteEmail({
          invite: updated,
          token,
          origin: requestOrigin(request),
          inviterName: inviter ? `${inviter.firstName} ${inviter.lastName}`.trim() : "The AviPrep team",
        })
        return NextResponse.json({ ok: true, attachedGuidelines: sent.attachedGuidelines })
      } catch (error) {
        // The email didn't go, so put the old link back rather than silently breaking it.
        await prisma.curatorInvite.update({ where: { id: invite.id }, data: { ...previous, sendCount: invite.sendCount } })
        console.error("Curator invite resend failed:", error)
        return NextResponse.json({ error: "The email didn't send. Try again." }, { status: 502 })
      }
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 })
  } catch (error) {
    console.error("Curator invite action error:", error)
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 })
  }
}
