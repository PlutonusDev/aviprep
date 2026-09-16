import "server-only"

import type Stripe from "stripe"
import { stripe } from "@lib/stripe"
import type { PaymentActual } from "./money"

/**
 * What Stripe actually took, per payment, for a date range: the amount charged
 * after coupons, refunds so far, and Stripe's real fee from the balance
 * transaction. Keyed by PaymentIntent id, which is what Purchase.stripePaymentId
 * stores.
 *
 * Results are cached briefly per range: the sales and payouts pages ask for the
 * same month repeatedly, and Stripe's list API is paged and rate limited.
 */

export interface UnmatchedCharge {
  id: string
  paymentIntentId: string | null
  description: string | null
  chargedCents: number
  refundedCents: number
  feeCents: number
  chargedAt: Date
}

export interface StripeActuals {
  ok: boolean
  error?: string
  actuals: Map<string, PaymentActual>
  /** Every successful charge in the range, so the caller can find ones with no Purchase. */
  charges: UnmatchedCharge[]
  fetchedAt: Date
}

const TTL_MS = 10 * 60_000
const cache = new Map<string, { expires: number; value: StripeActuals }>()

export async function stripeActuals(start: Date, end: Date, { refresh = false } = {}): Promise<StripeActuals> {
  const key = `${start.toISOString()}|${end.toISOString()}`
  const hit = cache.get(key)
  if (!refresh && hit && hit.expires > Date.now()) return hit.value

  if (!process.env.STRIPE_SECRET_KEY) {
    return { ok: false, error: "Stripe isn't configured, so these are estimates.", actuals: new Map(), charges: [], fetchedAt: new Date() }
  }

  try {
    const list = await stripe.charges
      .list({
        created: { gte: Math.floor(start.getTime() / 1000), lt: Math.floor(end.getTime() / 1000) },
        limit: 100,
        expand: ["data.balance_transaction"],
      })
      .autoPagingToArray({ limit: 10_000 })

    const actuals = new Map<string, PaymentActual>()
    const charges: UnmatchedCharge[] = []
    for (const charge of list) {
      if (charge.status !== "succeeded" || !charge.paid || charge.currency !== "aud") continue
      const balance = charge.balance_transaction as Stripe.BalanceTransaction | string | null
      const feeCents = balance && typeof balance === "object" ? balance.fee : 0
      const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id ?? null
      const row = {
        id: charge.id,
        paymentIntentId,
        description: charge.description,
        chargedCents: charge.amount,
        refundedCents: charge.amount_refunded,
        feeCents,
        chargedAt: new Date(charge.created * 1000),
      }
      charges.push(row)
      if (paymentIntentId) {
        const existing = actuals.get(paymentIntentId)
        // A PaymentIntent can have more than one charge (a retry); add them up.
        actuals.set(paymentIntentId, {
          chargedCents: (existing?.chargedCents ?? 0) + row.chargedCents,
          refundedCents: (existing?.refundedCents ?? 0) + row.refundedCents,
          feeCents: (existing?.feeCents ?? 0) + row.feeCents,
          chargedAt: existing?.chargedAt ?? row.chargedAt,
        })
      }
    }

    const value = { ok: true, actuals, charges, fetchedAt: new Date() }
    cache.set(key, { expires: Date.now() + TTL_MS, value })
    return value
  } catch (error) {
    console.error("Stripe charges fetch failed:", error)
    return { ok: false, error: "Couldn't reach Stripe, so these are estimates.", actuals: new Map(), charges: [], fetchedAt: new Date() }
  }
}
