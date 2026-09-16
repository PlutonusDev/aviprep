import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@lib/prisma"
import { getCurator } from "@lib/curators/session"
import { statementDocuments } from "@lib/finance/send"

export const dynamic = "force-dynamic"

/** ?doc=statement|invoice. A curator's own statement or RCTI, once an admin has sent it. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ statementId: string }> }) {
  const curator = await getCurator()
  if (!curator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { statementId } = await params
  const statement = /^[a-f0-9]{24}$/i.test(statementId) ? await prisma.royaltyStatement.findUnique({ where: { id: statementId } }) : null
  // Drafts and voided statements stay with admins.
  if (!statement || statement.curatorId !== curator.id || (statement.status !== "sent" && statement.status !== "paid")) {
    return NextResponse.json({ error: "Not found." }, { status: 404 })
  }

  const doc = request.nextUrl.searchParams.get("doc") === "invoice" ? "invoice" : "statement"
  const { snapshot, statementPdf, invoicePdf } = await statementDocuments(statement)
  const pdf = doc === "invoice" ? invoicePdf : statementPdf
  if (!pdf) return NextResponse.json({ error: "There’s no invoice for this statement." }, { status: 404 })

  const name = doc === "invoice" ? `AviPrep-RCTI-${snapshot.number}.pdf` : `AviPrep-Royalty-Statement-${snapshot.number}.pdf`
  const download = request.nextUrl.searchParams.get("download") === "1"
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  })
}
