import { NextResponse } from "next/server"
import { GUIDELINES_NAME, readGuidelines } from "@lib/curators/invites"

/** The content guidelines PDF, the same file attached to every invite. */
export async function GET() {
  const pdf = await readGuidelines()
  if (!pdf) return NextResponse.json({ error: "The guidelines aren't available right now." }, { status: 404 })

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${GUIDELINES_NAME}"`,
      "Cache-Control": "public, max-age=3600",
    },
  })
}
