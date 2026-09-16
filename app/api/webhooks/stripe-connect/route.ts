import { NextResponse, type NextRequest } from "next/server"
import type Stripe from "stripe"
import { stripe } from "@lib/stripe"
import { prisma } from "@lib/prisma"
import { syncAccount } from "@lib/finance/connect"

export const runtime = "nodejs"

/**
 * Events from curators' connected accounts, so payout status and the masked
 * bank details stay current without polling. In Stripe, add a Connect webhook
 * endpoint pointing here for: account.updated, account.external_account.created,
 * account.external_account.updated, account.external_account.deleted,
 * transfer.reversed. Its signing secret goes in STRIPE_CONNECT_WEBHOOK_SECRET.
 *
 * Unlike the payments webhook, this never accepts unsigned events.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET
  const signature = request.headers.get("stripe-signature")
  if (!secret || !signature) return NextResponse.json({ error: "Not configured" }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret)
  } catch (error) {
    console.error("Connect webhook signature failed:", error)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "account.updated":
        await syncAccount(event.data.object as Stripe.Account)
        break
      case "account.external_account.created":
      case "account.external_account.updated":
      case "account.external_account.deleted":
        if (event.account) await syncAccount(event.account)
        break
      case "transfer.reversed": {
        // A reversed royalty transfer means the statement isn't paid after all.
        const transfer = event.data.object as Stripe.Transfer
        await prisma.royaltyStatement.updateMany({
          where: { stripeTransferId: transfer.id },
          data: { status: "sent", paidAt: null, transferError: "The Stripe transfer was reversed." },
        })
        break
      }
    }
  } catch (error) {
    console.error("Connect webhook handling failed:", event.type, error)
    return NextResponse.json({ error: "Handler failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
