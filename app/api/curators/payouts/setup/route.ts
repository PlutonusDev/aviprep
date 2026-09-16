import { NextResponse } from "next/server"
import { getCurator } from "@lib/curators/session"
import { payoutSetupLink } from "@lib/finance/connect"
import { requestOrigin } from "@lib/email-verification"
import { isCuratorHost } from "@lib/tenant"

async function link(request: Request) {
  if (!isCuratorHost(request.headers.get("host") ?? "")) return { error: "Not found", status: 404 }
  const curator = await getCurator()
  if (!curator) return { error: "Unauthorized", status: 401 }
  try {
    return await payoutSetupLink(curator.id, requestOrigin(request))
  } catch (error) {
    console.error("Payout setup link failed:", curator.id, error)
    return { error: "Stripe isn’t available right now. Try again shortly.", status: 502 }
  }
}

/** Starts or continues payout setup on Stripe, or opens their Stripe dashboard to manage bank details. */
export async function POST(request: Request) {
  const result = await link(request)
  return "url" in result ? NextResponse.json(result) : NextResponse.json({ error: result.error }, { status: result.status })
}

/** Stripe sends people here when an onboarding link has expired: make a fresh one and carry on. */
export async function GET(request: Request) {
  const result = await link(request)
  if ("url" in result) return NextResponse.redirect(result.url)
  return NextResponse.redirect(new URL("/admin/earnings?stripe=error", request.url))
}
