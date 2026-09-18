import { NextResponse } from "next/server"
import { getCurator } from "@lib/curators/session"
import { curatorLibrary, libraryCounts } from "@lib/curators/library"

export const dynamic = "force-dynamic"

/** Everything this curator has written, in whatever state it's in. */
export async function GET() {
  const curator = await getCurator()
  if (!curator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const items = await curatorLibrary(curator.id)
  return NextResponse.json({ items, counts: libraryCounts(items) })
}
