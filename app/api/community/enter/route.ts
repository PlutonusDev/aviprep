import { NextResponse } from "next/server"
import { startSession } from "@lib/auth"
import { redeemTicket } from "@lib/curators/community"

export const dynamic = "force-dynamic"

const ALLOWED = ["/dashboard/forum", "/dashboard/messages"]

/**
 * Where a curator lands coming over from the studio. The ticket is checked, a
 * normal member session is started here on the main site, and from this point
 * on they're simply a signed-in member reading the forums.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const ticket = url.searchParams.get("ticket") ?? ""
  const requested = url.searchParams.get("to") ?? "/dashboard/forum"
  const to = ALLOWED.find((p) => requested === p || requested.startsWith(`${p}/`)) ? requested : "/dashboard/forum"

  const user = await redeemTicket(ticket)
  if (!user) {
    // Expired, replayed, or the link was pulled: send them to sign in normally.
    return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(to)}`, url.origin))
  }

  await startSession(user)
  return NextResponse.redirect(new URL(to, url.origin))
}
