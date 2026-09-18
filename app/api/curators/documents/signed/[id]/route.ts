import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { getCurator } from "@lib/curators/session"
import { readSignedPdf } from "@lib/agreements/store"

export const dynamic = "force-dynamic"

/** A curator's own signed copy. Theirs to download, any time, forever. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const curator = await getCurator()
  if (!curator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const row = await prisma.signedDocument.findUnique({
    where: { id },
    select: { curatorId: true, title: true, signerName: true, signedAt: true, pdfUrl: true },
  })
  if (!row || row.curatorId !== curator.id) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const pdf = await readSignedPdf(row.pdfUrl)
  if (!pdf) return NextResponse.json({ error: "That copy has gone missing. Let us know and we'll sort it out." }, { status: 404 })

  const name = `${row.title} - ${row.signerName} - ${row.signedAt.toISOString().slice(0, 10)}.pdf`.replace(/[^\w\-. ]/g, "")
  const download = new URL(request.url).searchParams.get("download") === "1"
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  })
}
