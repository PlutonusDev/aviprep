import { type NextRequest, NextResponse } from "next/server"
import { isResponse, requireStaff } from "@lib/staff"
import { coverageDetail } from "@lib/mos/coverage"
import { getLibraryStatus } from "@lib/mos/library"
import { ITEM_COLUMNS, MODULE_COLUMNS, itemMatrixRows, matrixMeta, moduleMatrixRows, toCsv } from "@lib/mos/matrix"

export const dynamic = "force-dynamic"

/**
 * CSV compliance matrices.
 *   ?subjectId=cpl-aerodynamics&view=items    MOS element → AviPrep content
 *   ?subjectId=cpl-aerodynamics&view=modules  AviPrep module → MOS elements
 */
export async function GET(request: NextRequest) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const subjectId = request.nextUrl.searchParams.get("subjectId") ?? ""
  const view = request.nextUrl.searchParams.get("view") === "modules" ? "modules" : "items"

  const [detail, library] = await Promise.all([coverageDetail(subjectId), getLibraryStatus()])
  if (!detail) return NextResponse.json({ error: "This subject has no Schedule 3 units." }, { status: 404 })

  const meta = matrixMeta(detail, library)
  const csv =
    view === "modules" ? toCsv(MODULE_COLUMNS, moduleMatrixRows(detail)) : toCsv(ITEM_COLUMNS, itemMatrixRows(detail))
  const filename = `${meta.documentRef}-${view === "modules" ? "modules" : "mos-elements"}.csv`

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
