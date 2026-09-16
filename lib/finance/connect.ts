import "server-only"

import type Stripe from "stripe"
import { prisma } from "@lib/prisma"
import { stripe } from "@lib/stripe"

/**
 * Curator payouts through Stripe.
 *
 * - Each curator gets a Stripe customer when they join, and a Stripe connected
 *   account (Express) when they set up payouts. They enter their bank details
 *   on Stripe's own pages, so AviPrep never sees or stores them. All we keep
 *   is the bank name and last four digits, for showing them back.
 * - A royalty is paid by transferring the statement's amount from AviPrep's
 *   Stripe balance to the curator's account. Stripe then pays it out to their
 *   bank on its usual schedule.
 */

export type PayoutAccountStatus = "none" | "incomplete" | "pending" | "ready"

export function payoutAccountStatus(c: {
  stripeAccountId: string | null
  stripeDetailsSubmitted: boolean | null
  stripePayoutsEnabled: boolean | null
}): PayoutAccountStatus {
  if (!c.stripeAccountId) return "none"
  if (!c.stripeDetailsSubmitted) return "incomplete"
  if (!c.stripePayoutsEnabled) return "pending"
  return "ready"
}

export const PAYOUT_STATUS_LABELS: Record<PayoutAccountStatus, string> = {
  none: "Payouts not set up",
  incomplete: "Payout setup unfinished",
  pending: "Stripe is verifying",
  ready: "Ready for payouts",
}

const configured = () => !!process.env.STRIPE_SECRET_KEY

/** Creates their Stripe customer if they don't have one. Never throws: joining mustn't fail because Stripe did. */
export async function ensureCustomer(curator: { id: string; email: string; firstName: string; lastName: string; phone: string; stripeCustomerId?: string | null }) {
  if (curator.stripeCustomerId || !configured()) return curator.stripeCustomerId ?? null
  try {
    const customer = await stripe.customers.create(
      {
        email: curator.email,
        name: `${curator.firstName} ${curator.lastName}`.trim(),
        phone: curator.phone,
        metadata: { curatorId: curator.id, kind: "curator" },
      },
      { idempotencyKey: `curator-customer-${curator.id}` },
    )
    await prisma.curator.update({ where: { id: curator.id }, data: { stripeCustomerId: customer.id } })
    return customer.id
  } catch (error) {
    console.error("Stripe customer for curator failed:", curator.id, error)
    return null
  }
}

/** Their connected account, created on first use. */
async function ensureAccount(curatorId: string) {
  const curator = await prisma.curator.findUnique({
    where: { id: curatorId },
    select: { id: true, email: true, firstName: true, lastName: true, phone: true, stripeCustomerId: true, stripeAccountId: true },
  })
  if (!curator) throw new Error("Curator not found")
  if (curator.stripeAccountId) return curator.stripeAccountId

  await ensureCustomer(curator)
  const account = await stripe.accounts.create(
    {
      type: "express",
      country: "AU",
      email: curator.email,
      business_type: "individual",
      capabilities: { transfers: { requested: true } },
      business_profile: { product_description: "Writes exam questions and lessons for AviPrep and receives content royalties." },
      individual: { first_name: curator.firstName, last_name: curator.lastName, email: curator.email },
      metadata: { curatorId: curator.id },
    },
    { idempotencyKey: `curator-account-${curator.id}` },
  )
  await prisma.curator.update({ where: { id: curator.id }, data: { stripeAccountId: account.id, stripeSyncedAt: new Date() } })
  return account.id
}

/** Refreshes what we show about their Stripe account. Bank details come back only as a name and last four digits. */
export async function syncAccount(accountOrId: Stripe.Account | string) {
  const account = typeof accountOrId === "string" ? await stripe.accounts.retrieve(accountOrId) : accountOrId
  const external = account.external_accounts?.data?.find((a): a is Stripe.BankAccount => a.object === "bank_account")
  const bank =
    external ??
    ((await stripe.accounts.listExternalAccounts(account.id, { object: "bank_account", limit: 1 })).data[0] as Stripe.BankAccount | undefined)

  const data = {
    stripeDetailsSubmitted: !!account.details_submitted,
    stripePayoutsEnabled: !!account.payouts_enabled && account.capabilities?.transfers === "active",
    stripeRequirementsDue: account.requirements?.currently_due?.length ?? 0,
    stripeBankName: bank?.bank_name ?? null,
    stripeBankLast4: bank?.last4 ?? null,
    stripeSyncedAt: new Date(),
  }
  await prisma.curator.updateMany({ where: { stripeAccountId: account.id }, data })
  return data
}

/** Syncs curators whose cached status is older than maxAgeMs. Failures are logged and skipped. */
export async function syncStale(curators: { stripeAccountId: string | null; stripeSyncedAt: Date | null }[], maxAgeMs = 60 * 60_000) {
  const stale = curators.filter((c) => c.stripeAccountId && (!c.stripeSyncedAt || Date.now() - c.stripeSyncedAt.getTime() > maxAgeMs))
  await Promise.all(
    stale.slice(0, 20).map((c) =>
      syncAccount(c.stripeAccountId!).catch((error) => console.error("Stripe account sync failed:", c.stripeAccountId, error)),
    ),
  )
  return stale.length
}

/**
 * A link to Stripe's hosted onboarding, or to their Stripe Express dashboard
 * once they've finished it (that's where they change bank details).
 */
export async function payoutSetupLink(curatorId: string, origin: string) {
  const accountId = await ensureAccount(curatorId)
  const account = await stripe.accounts.retrieve(accountId)
  await syncAccount(account)

  if (account.details_submitted) {
    const login = await stripe.accounts.createLoginLink(accountId)
    return { url: login.url, kind: "dashboard" as const }
  }
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${origin}/api/curators/payouts/setup?retry=1`,
    return_url: `${origin}/admin/earnings?stripe=returned`,
    collection_options: { fields: "currently_due" },
  })
  return { url: link.url, kind: "onboarding" as const }
}

/** AviPrep's Stripe balance available to transfer now, in cents. */
export async function availableBalance() {
  if (!configured()) return null
  try {
    const balance = await stripe.balance.retrieve()
    return balance.available.filter((b) => b.currency === "aud").reduce((n, b) => n + b.amount, 0)
  } catch (error) {
    console.error("Stripe balance failed:", error)
    return null
  }
}

export interface TransferResult {
  ok: boolean
  error?: string
  transferId?: string
}

/**
 * Pays a sent statement by transfer to the curator's connected account.
 * Idempotent per statement, so a double click or retry can't pay twice.
 */
export async function payStatement(statementId: string): Promise<TransferResult> {
  const statement = await prisma.royaltyStatement.findUnique({ where: { id: statementId } })
  if (!statement) return { ok: false, error: "Statement not found." }
  if (statement.status === "paid") return { ok: false, error: "It’s already paid." }
  if (statement.status !== "sent") return { ok: false, error: "Send the statement before paying it." }
  if (statement.payableCents <= 0) return { ok: false, error: "There’s nothing to pay." }

  const curator = await prisma.curator.findUnique({ where: { id: statement.curatorId }, select: { stripeAccountId: true, firstName: true } })
  if (!curator?.stripeAccountId) return { ok: false, error: `${curator?.firstName ?? "They"} haven’t set up payouts yet.` }

  const fail = async (error: string) => {
    await prisma.royaltyStatement.update({ where: { id: statement.id }, data: { transferError: error } })
    return { ok: false, error }
  }

  try {
    const synced = await syncAccount(curator.stripeAccountId)
    if (!synced.stripePayoutsEnabled) return fail(`${curator.firstName}’s Stripe account can’t receive payouts yet.`)

    const transfer = await stripe.transfers.create(
      {
        amount: statement.payableCents,
        currency: "aud",
        destination: curator.stripeAccountId,
        transfer_group: statement.number,
        description: `AviPrep royalties ${statement.number}`,
        metadata: { statementId: statement.id, statement: statement.number, period: statement.period, curatorId: statement.curatorId },
      },
      { idempotencyKey: `royalty-transfer-${statement.id}` },
    )

    await prisma.royaltyStatement.update({
      where: { id: statement.id },
      data: { status: "paid", paidAt: new Date(), stripeTransferId: transfer.id, paymentReference: transfer.id, transferError: null },
    })
    return { ok: true, transferId: transfer.id }
  } catch (error) {
    const message = (error as Stripe.errors.StripeError)?.code === "balance_insufficient"
      ? "Not enough available in AviPrep’s Stripe balance."
      : (error as Error)?.message || "Stripe didn’t accept the transfer."
    console.error("Royalty transfer failed:", statement.number, error)
    return fail(message)
  }
}
