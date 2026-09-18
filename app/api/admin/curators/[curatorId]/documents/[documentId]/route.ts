import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { isResponse, requireStaff } from "@lib/staff"
import { readSignedPdf, verifySignedDocument } from "@lib/agreements/store"

export const dynamic = "force-dynamic"

async function owned(curatorId: string, documentId: string) {
  const row = await prisma.signedDocument.findUnique({
    where: { id: documentId },
    select: { curatorId: true, title: true, signerName: true, signedAt: true, pdfUrl: true },
  })
  return row && row.curatorId === curatorId ? row : null
}

/** The signed PDF itself, or a fresh verification of it with ?verify=1. */
export async function GET(request: Request, { params }: { params: Promise<{ curatorId: string; documentId: string }> }) {
  const staff = await requireStaff()
  if (isResponse(staff)) return staff

  const { curatorId, documentId } = await params
  const row = await owned(curatorId, documentId)
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (new URL(request.url).searchParams.get("verify") === "1") {
    const result = await verifySignedDocument(documentId)
    return NextResponse.json(result ?? { error: "Not found" }, { status: result ? 200 : 404 })
  }

  const pdf = await readSignedPdf(row.pdfUrl)
  if (!pdf) return NextResponse.json({ error: "The signed PDF is missing from storage." }, { status: 404 })

  const name = `${row.title} - ${row.signerName} - ${row.signedAt.toISOString().slice(0, 10)}.pdf`.replace(/[^\w\-. ]/g, "")
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${name}"`, "Cache-Control": "private, no-store" },
  })
}

/** Voids a signature: superseded, or signed in error. The record is kept. */
export async function POST(request: Request, { params }: { params: Promise<{ curatorId: string; documentId: string }> }) {
  const staff = await requireStaff()
  if (isResponse(staff)) return staff

  const { curatorId, documentId } = await params
  if (!(await owned(curatorId, documentId))) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : ""
  if (reason.length < 5) return NextResponse.json({ error: "Say why it's being voided." }, { status: 400 })

  await prisma.signedDocument.update({ where: { id: documentId }, data: { voidedAt: new Date(), voidReason: reason } })
  return NextResponse.json({ ok: true })
}
