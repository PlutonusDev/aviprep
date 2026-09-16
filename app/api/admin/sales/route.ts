import { NextResponse, type NextRequest } from "next/server"
import { isResponse, requireStaff } from "@lib/staff"
import { salesReport } from "@lib/finance/sales"
import { parsePeriod } from "@lib/finance/money"

export const dynamic = "force-dynamic"

/** ?from=2026-07&to=2026-09&refresh=1 */
export async function GET(request: NextRequest) {
  const staff = await requireStaff()
  if (isResponse(staff)) return staff

  const from = request.nextUrl.searchParams.get("from") ?? ""
  const to = request.nextUrl.searchParams.get("to") ?? from
  if (!parsePeriod(from) || !parsePeriod(to) || from > to) {
    return NextResponse.json({ error: "Choose a valid date range." }, { status: 400 })
  }

  try {
    const report = await salesReport(from, to, { refresh: request.nextUrl.searchParams.get("refresh") === "1" })
    if (!report) return NextResponse.json({ error: "Choose a valid date range." }, { status: 400 })
    return NextResponse.json({ report })
  } catch (error) {
    console.error("Sales report error:", error)
    return NextResponse.json({ error: "Couldn't build the sales report." }, { status: 500 })
  }
}
