import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { getCurator } from "@lib/curators/session"
import { documentStatuses } from "@lib/agreements/store"

export const dynamic = "force-dynamic"

/** A curator's paperwork: what's signed, what's still needed, what doesn't apply. */
export async function GET() {
  const curator = await getCurator()
  if (!curator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const signed = await prisma.signedDocument.findMany({
    where: { curatorId: curator.id },
    orderBy: { signedAt: "desc" },
    select: { id: true, kind: true, version: true, title: true, signerName: true, signedAt: true, voidedAt: true },
  })

  return NextResponse.json({
    documents: documentStatuses(curator, signed),
    // Every signature they've made, including superseded ones, to download.
    history: signed.map((s) => ({
      id: s.id,
      kind: s.kind,
      title: s.title,
      version: s.version,
      signerName: s.signerName,
      signedAt: s.signedAt.toISOString(),
      voidedAt: s.voidedAt?.toISOString() ?? null,
    })),
    tax: { abn: curator.abn, gstRegistered: curator.gstRegistered, status: curator.taxStatus },
  })
}
