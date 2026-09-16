import "server-only"

import type Stripe from "stripe"
import { prisma } from "@lib/prisma"
import { stripe } from "@lib/stripe"
import { ensureCustomer, stripeReturnOrigin } from "./connect"

/** Curator KYC through Stripe Identity, using AviPrep's verification flow. Required before payouts. */

export const IDENTITY_FLOW = process.env.STRIPE_IDENTITY_FLOW || "vf_1UGLtLL8qLbqF4tCnOBGU0aO"

export type IdentityStatus = "none" | "requires_input" | "processing" | "verified" | "canceled"

export const identityStatus = (c: { identityStatus: string | null }): IdentityStatus => (c.identityStatus as IdentityStatus) || "none"
export const isVerified = (c: { identityStatus: string | null }) => c.identityStatus === "verified"

/** Stores what Stripe says about a verification session. */
export async function syncVerification(sessionOrId: Stripe.Identity.VerificationSession | string) {
  const session = typeof sessionOrId === "string" ? await stripe.identity.verificationSessions.retrieve(sessionOrId) : sessionOrId
  await prisma.curator.updateMany({
    where: { identitySessionId: session.id },
    data: {
      identityStatus: session.status,
      identityVerifiedAt: session.status === "verified" ? new Date() : undefined,
      identityError: session.status === "requires_input" ? session.last_error?.reason ?? null : null,
    },
  })
  return session.status
}

/** A link to Stripe's hosted verification. Reuses an open session so a half-finished attempt can be resumed. */
export async function verificationLink(curatorId: string, origin: string) {
  const curator = await prisma.curator.findUnique({ where: { id: curatorId } })
  if (!curator) throw new Error("Curator not found")
  if (curator.identityStatus === "verified") return null

  if (curator.identitySessionId) {
    const existing = await stripe.identity.verificationSessions.retrieve(curator.identitySessionId)
    await syncVerification(existing)
    if (existing.status === "verified" || existing.status === "processing") return null
    if (existing.status === "requires_input" && existing.url) return existing.url
  }

  const customerId = await ensureCustomer(curator)
  const session = await stripe.identity.verificationSessions.create({
    verification_flow: IDENTITY_FLOW,
    client_reference_id: curator.id,
    ...(customerId ? { related_customer: customerId } : {}),
    provided_details: { email: curator.email, phone: curator.phone },
    return_url: `${stripeReturnOrigin(origin)}/admin/earnings?identity=returned`,
    metadata: { curatorId: curator.id },
  })
  await prisma.curator.update({
    where: { id: curator.id },
    data: { identitySessionId: session.id, identityStatus: session.status, identityError: null },
  })
  return session.url
}
