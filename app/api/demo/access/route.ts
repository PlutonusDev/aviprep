import { NextResponse } from "next/server"
import { endDemoSession, grantForCode, recordOpen, startDemoSession } from "@lib/demo/access"

/**
 *   POST { code }  open the demo for that organisation
 *   DELETE         close it
 *
 * Deliberately vague about why a code failed: a wrong one and a revoked one
 * read the same, so the endpoint can't be used to find live codes.
 */

const NO = "That code doesn't work. Check the email, or ask us for a new one."

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const code = typeof body.code === "string" ? body.code : ""

  try {
    const found = await grantForCode(code)
    if (!found || found.status !== "active") {
      return NextResponse.json({ error: NO }, { status: 401 })
    }

    await startDemoSession(found.grant.id, found.grant.expiresAt)
    await recordOpen(found.grant.id)

    return NextResponse.json({ organisation: found.grant.organisation })
  } catch (error) {
    console.error("Demo access failed:", error)
    return NextResponse.json({ error: "Something went wrong at our end. Try again shortly." }, { status: 503 })
  }
}

export async function DELETE() {
  await endDemoSession()
  return NextResponse.json({ success: true })
}
