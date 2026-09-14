import { NextResponse } from "next/server"
import { getSession } from "@lib/auth"
import { prisma } from "@lib/prisma"
import { stripe } from "@lib/stripe"

/**
 * Opens Stripe's hosted billing portal, where the customer updates their card,
 * downloads invoices and cancels a subscription. Replaces the settings buttons
 * that did nothing.
 *
 * Needs a portal configuration saved once in the Stripe dashboard
 * (Settings > Billing > Customer portal).
 */
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { stripeCustomerId: true },
    })
    if (!user?.stripeCustomerId) {
      return NextResponse.json({ error: "No billing account yet" }, { status: 404 })
    }

    const origin = request.headers.get("origin") ?? new URL(request.url).origin
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${origin}/dashboard/settings#billing`,
    })

    return NextResponse.json({ url: portal.url })
  } catch (error) {
    console.error("Billing portal error:", error)
    return NextResponse.json({ error: "Couldn't open billing" }, { status: 500 })
  }
}
