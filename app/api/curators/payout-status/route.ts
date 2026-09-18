import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { getCurator } from "@lib/curators/session"
import { payoutAccountStatus } from "@lib/finance/connect"
import { identityStatus } from "@lib/finance/identity"
import { documentStatuses, outstanding } from "@lib/agreements/store"

export const dynamic = "force-dynamic"

/**
 * Just enough for the studio's setup banner: what we already have on record, so
 * every page view doesn't call Stripe. The Earnings page does the real syncing.
 */
export async function GET() {
  const curator = await getCurator()
  if (!curator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const signed = await prisma.signedDocument.findMany({
    where: { curatorId: curator.id },
    select: { id: true, kind: true, version: true, signerName: true, signedAt: true, voidedAt: true },
  })
  const todo = outstanding(documentStatuses(curator, signed))

  return NextResponse.json({
    identity: identityStatus(curator),
    payouts: payoutAccountStatus(curator),
    paperwork: { outstanding: todo.length, next: todo[0]?.shortTitle ?? null },
  })
}
