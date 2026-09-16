import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@lib/prisma"
import { isResponse, requireStaff } from "@lib/staff"
import { renderInvoice, renderStatement } from "@lib/finance/documents"
import { computePeriod, financialYearToDate, isPeriod } from "@lib/finance/payouts"
import { statementDocuments } from "@lib/finance/send"

export const dynamic = "force-dynamic"

/**
 * A statement or invoice PDF, opened in a new tab.
 *   ?doc=statement|invoice&statementId=...          a generated statement, as it will be (or was) sent
 *   ?doc=statement|invoice&period=2026-09&curatorId= a live preview before anything's generated
 */
export async function GET(request: NextRequest) {
  const staff = await requireStaff()
  if (isResponse(staff)) return staff

  const q = request.nextUrl.searchParams
  const doc = q.get("doc") === "invoice" ? "invoice" : "statement"

  try {
    let pdf: Buffer | null = null
    let number = "preview"

    const statementId = q.get("statementId")
    if (statementId) {
      const statement = await prisma.royaltyStatement.findUnique({ where: { id: statementId } })
      if (!statement) return NextResponse.json({ error: "Statement not found." }, { status: 404 })
      const docs = await statementDocuments(statement)
      pdf = doc === "invoice" ? docs.invoicePdf : docs.statementPdf
      number = docs.snapshot.number
    } else {
      const period = q.get("period")
      const curatorId = q.get("curatorId")
      if (!isPeriod(period) || !curatorId) return NextResponse.json({ error: "Missing period or curator." }, { status: 400 })
      const data = await computePeriod(period)
      const snapshot = data?.snapshotFor(curatorId, "DRAFT")
      if (!snapshot) return NextResponse.json({ error: "Curator not found." }, { status: 404 })
      pdf =
        doc === "invoice"
          ? await renderInvoice(snapshot, { draft: true })
          : await renderStatement(snapshot, { draft: true, ytd: await financialYearToDate(curatorId, period) })
    }

    if (!pdf) return NextResponse.json({ error: "No invoice for this curator: they need an ABN and a signed RCTI agreement." }, { status: 404 })

    const name = doc === "invoice" ? `AviPrep-RCTI-${number}.pdf` : `AviPrep-Royalty-Statement-${number}.pdf`
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Document render error:", error)
    return NextResponse.json({ error: "Couldn't make that document." }, { status: 500 })
  }
}
