import type { Metadata } from "next"
import { prisma } from "@lib/prisma"
import { formatMobile } from "@lib/curators/details"
import { INVITE_UNAVAILABLE, findInvite } from "@lib/curators/invites"
import { InviteProblem, JoinFlow } from "@/components/curators/join-flow"

export const metadata: Metadata = {
  title: "Join the content studio",
}

// Every visit checks the invite afresh.
export const dynamic = "force-dynamic"

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const found = await findInvite(token)

  if (!found) {
    return <InviteProblem title="This link doesn't work" message="It may have been copied incompletely. Check the email, or ask the AviPrep team for a new invite." />
  }
  if (found.status !== "pending") {
    return (
      <InviteProblem
        title={found.status === "accepted" ? "You've already joined" : found.status === "expired" ? "This invite has expired" : "This invite was cancelled"}
        message={INVITE_UNAVAILABLE[found.status]}
        signIn={found.status === "accepted"}
      />
    )
  }

  const { invite } = found
  const inviter = await prisma.user.findUnique({ where: { id: invite.invitedById }, select: { firstName: true } })

  return (
    <JoinFlow
      token={token}
      email={invite.email}
      inviterName={inviter?.firstName || "The AviPrep team"}
      note={invite.note}
      expiresAt={invite.expiresAt.toISOString()}
      prefill={{
        firstName: invite.firstName ?? "",
        lastName: invite.lastName ?? "",
        phone: invite.phone ? formatMobile(invite.phone) : "",
      }}
    />
  )
}
