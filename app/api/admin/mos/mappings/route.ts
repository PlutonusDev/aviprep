import { type NextRequest, NextResponse } from "next/server"
import { isResponse, requireStaff } from "@lib/staff"
import { mappingsFor } from "@lib/mos/mappings"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const contentType = request.nextUrl.searchParams.get("contentType")
  const contentId = request.nextUrl.searchParams.get("contentId") ?? ""
  if ((contentType !== "question" && contentType !== "lesson") || !/^[a-f0-9]{24}$/i.test(contentId)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }
  return NextResponse.json({ links: await mappingsFor(contentType, contentId) })
}
