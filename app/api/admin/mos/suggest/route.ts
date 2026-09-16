import { NextResponse } from "next/server"
import { isResponse, requireStaff } from "@lib/staff"
import { suggestItems } from "@lib/mos/suggest"
import { unitsForSubject } from "@lib/mos/subjects"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/** Top Schedule 3 matches for a draft question or lesson. */
export async function POST(request: Request) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const body = await request.json().catch(() => ({}))
  const subjectId = typeof body.subjectId === "string" ? body.subjectId : ""
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 6000) : ""
  const exclude: string[] = Array.isArray(body.exclude) ? body.exclude.filter((x: unknown) => typeof x === "string").slice(0, 50) : []

  if (!unitsForSubject(subjectId).length) {
    return NextResponse.json({ error: "This subject has no Schedule 3 units.", code: "no-units" }, { status: 400 })
  }
  if (text.length < 20) return NextResponse.json({ suggestions: [] })

  try {
    const suggestions = await suggestItems(subjectId, text, 5, exclude)
    return NextResponse.json({ suggestions, ...(suggestions.length ? {} : { code: "library-empty" }) })
  } catch (error) {
    console.error("MOS suggestions failed:", error)
    return NextResponse.json({ error: "Suggestions aren't available right now.", code: "unavailable" }, { status: 503 })
  }
}
