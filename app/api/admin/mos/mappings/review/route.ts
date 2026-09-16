import { NextResponse } from "next/server"
import { isResponse, requireStaff } from "@lib/staff"
import { reviewMapping, type ReviewAction } from "@lib/mos/mappings"

const ACTIONS: ReviewAction[] = ["confirm", "move", "remove"]

/** Resolve a link flagged by a MOS update: { mappingId, action, itemId? }. */
export async function POST(request: Request) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const body = await request.json().catch(() => ({}))
  if (typeof body.mappingId !== "string" || !/^[a-f0-9]{24}$/i.test(body.mappingId) || !ACTIONS.includes(body.action)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }

  const error = await reviewMapping(body.mappingId, body.action, staff.userId, typeof body.itemId === "string" ? body.itemId : undefined)
  if (error) return NextResponse.json({ error }, { status: 422 })
  return NextResponse.json({ ok: true })
}
