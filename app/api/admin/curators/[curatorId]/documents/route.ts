import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { isResponse, requireStaff } from "@lib/staff"
import { documentStatuses } from "@lib/agreements/store"

export const dynamic = "force-dynamic"

/** What a curator has signed, for the payment details panel. */
export async function GET(_request: Request, { params }: { params: Promise<{ curatorId: string }> }) {
  const staff = await requireStaff()
  if (isResponse(staff)) return staff

  const { curatorId } = await params
  const curator = await prisma.curator.findUnique({
    where: { id: curatorId },
    select: { abn: true, gstRegistered: true, taxStatus: true },
  })
  if (!curator) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const signed = await prisma.signedDocument.findMany({
    where: { curatorId },
    orderBy: { signedAt: "desc" },
    select: {
      id: true, kind: true, title: true, version: true, signerName: true,
      signedAt: true, ip: true, phone: true, documentHash: true, voidedAt: true, voidReason: true,
    },
  })

  return NextResponse.json({
    documents: documentStatuses(curator, signed),
    signatures: signed.map((s) => ({
      ...s,
      signedAt: s.signedAt.toISOString(),
      voidedAt: s.voidedAt?.toISOString() ?? null,
      // Enough to recognise, not enough to fill a column.
      fingerprint: s.documentHash.slice(0, 16).toUpperCase(),
    })),
  })
}
