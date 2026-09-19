import { NextResponse } from "next/server"
import { isResponse, requireStaff } from "@lib/staff"
import { UpdateMismatchError, applyUpdate, getLibraryStatus, previewUpdate, type Remap } from "@lib/mos/library"

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
 *   { action: "apply", builtAt: "<stamp>", remap } apply exactly the previewed data file
 *
 * `remap` is the admin's decision about each removed item's links: a MOS ID in
 * the new compilation to move them to, or nothing to leave them for review.
 */
/** Only string-to-string pairs survive; anything else is dropped rather than trusted. */
function readRemap(raw: unknown): Remap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  const out: Remap = {}
  for (const [from, to] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof to === "string" && to) out[from] = to
  }
  return out
}

export async function POST(request: Request) {
  const staff = await requireStaff()
  if (isResponse(staff)) return staff

  const body = await request.json().catch(() => ({}))
  try {
    if (body.action === "apply") {
      if (typeof body.builtAt !== "string") return NextResponse.json({ error: "Preview the update first." }, { status: 400 })
      const result = await applyUpdate(staff.userId, body.builtAt, readRemap(body.remap))
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
