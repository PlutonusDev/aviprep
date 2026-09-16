import { NextResponse } from "next/server"
import { getCurator } from "@lib/curators/session"
import { verificationLink } from "@lib/finance/identity"
import { stripeErrorMessage } from "@lib/finance/connect"
import { requestOrigin } from "@lib/email-verification"
import { isCuratorHost } from "@lib/tenant"

/** Starts or resumes Stripe Identity verification. Returns { url }, or { done: true } if there's nothing to do. */
export async function POST(request: Request) {
  if (!isCuratorHost(request.headers.get("host") ?? "")) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const curator = await getCurator()
  if (!curator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const url = await verificationLink(curator.id, requestOrigin(request))
    return NextResponse.json(url ? { url } : { done: true })
  } catch (error) {
    console.error("Identity session failed:", curator.id, error)
    return NextResponse.json({ error: stripeErrorMessage(error) }, { status: 502 })
  }
}
