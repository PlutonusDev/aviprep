import { NextResponse } from "next/server"
import { getCurator } from "@lib/curators/session"
import { issueTicket } from "@lib/curators/community"
import { mainSiteOrigin } from "@lib/tenant"

export const dynamic = "force-dynamic"

const DESTINATIONS: Record<string, string> = {
  forum: "/dashboard/forum",
  messages: "/dashboard/messages",
}

/**
 * A link into the community, carrying a 90-second ticket. The studio and the
 * main site are different hosts, so the session is started over there.
 */
export async function POST(request: Request) {
  const curator = await getCurator()
  if (!curator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!curator.userId) return NextResponse.json({ error: "Join the community first." }, { status: 409 })

  const body = await request.json().catch(() => ({}))
  const to = DESTINATIONS[typeof body.to === "string" ? body.to : "forum"] ?? DESTINATIONS.forum

  const ticket = await issueTicket(curator.id, curator.userId)
  const url = new URL("/api/community/enter", mainSiteOrigin(request.headers.get("host") ?? ""))
  url.searchParams.set("ticket", ticket)
  url.searchParams.set("to", to)
  return NextResponse.json({ url: url.toString() })
}
