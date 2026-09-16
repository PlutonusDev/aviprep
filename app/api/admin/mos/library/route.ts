import { NextResponse } from "next/server"
import { isResponse, requireStaff } from "@lib/staff"
import { UpdateMismatchError, applyUpdate, getLibraryStatus, previewUpdate } from "@lib/mos/library"

export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function GET() {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff
  return NextResponse.json({ library: await getLibraryStatus() })
}

/**
 * Admins only.
 *   { action: "preview" }                  what an update would do; writes nothing
 *   { action: "apply", builtAt: "<stamp>" } apply exactly the previewed data file
 */
export async function POST(request: Request) {
  const staff = await requireStaff()
  if (isResponse(staff)) return staff

  const body = await request.json().catch(() => ({}))
  try {
    if (body.action === "apply") {
      if (typeof body.builtAt !== "string") return NextResponse.json({ error: "Preview the update first." }, { status: 400 })
      const result = await applyUpdate(staff.userId, body.builtAt)
      return NextResponse.json({ result, library: await getLibraryStatus() })
    }
    return NextResponse.json({ preview: await previewUpdate() })
  } catch (error) {
    if (error instanceof UpdateMismatchError) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error("MOS library update failed:", error)
    return NextResponse.json(
      { error: body.action === "apply" ? "The update didn't finish. Preview and apply it again." : "Couldn't load the preview." },
      { status: 500 },
    )
  }
}
