import { NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { runMonthlyStatements } from "@lib/finance/monthly"

export const dynamic = "force-dynamic"

/**
 * For an external scheduler, as well as or instead of the built-in hourly check
 * (instrumentation.ts). Needs "Authorization: Bearer <CRON_SECRET>". Safe to
 * call as often as you like: each month's statements are only generated once.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const outcome = await runMonthlyStatements()
  return NextResponse.json({ ran: outcome.ran, error: outcome.error, result: outcome.result ?? null })
}
