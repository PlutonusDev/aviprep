import "server-only"

import { prisma } from "@lib/prisma"
import { SUBJECTS } from "@lib/subjects"
import { BUSINESS, aviprepGstRegistered } from "./business"
import { payoutAccountStatus, syncStale } from "./connect"
import {
  computeStatement,
  financialYearPeriods,
  isValidAbn,
  parsePeriod,
  paymentDueDate,
  periodLabel,
  periodRange,
  type InvoiceKind,
  type StatementLine,
  type TaxStatus,
} from "./money"
import { contentBySubject, subjectSalesFor } from "./sales"

/**
 * Curator payouts for a month: what each curator is owed, and the statements
 * and RCTIs that record it. A statement is a frozen snapshot, so what was
 * sent never changes even as sales, points or payment details move on.
 */

export const PAYMENT_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  isActive: true,
  legalName: true,
  tradingName: true,
  address: true,
  taxStatus: true,
  abn: true,
  gstRegistered: true,
  hobbyFormAt: true,
  rctiAgreementAt: true,
  paymentNotes: true,
  identityStatus: true,
  stripeAccountId: true,
  stripeDetailsSubmitted: true,
  stripePayoutsEnabled: true,
  stripeRequirementsDue: true,
  stripeBankName: true,
  stripeBankLast4: true,
  stripeSyncedAt: true,
} as const

type PaymentCurator = {
  id: string
  email: string
  firstName: string
  lastName: string
  isActive: boolean
  legalName: string | null
  tradingName: string | null
  address: string | null
  taxStatus: string | null
  abn: string | null
  gstRegistered: boolean | null
  hobbyFormAt: Date | null
  rctiAgreementAt: Date | null
  paymentNotes: string | null
  identityStatus: string | null
  stripeAccountId: string | null
  stripeDetailsSubmitted: boolean | null
  stripePayoutsEnabled: boolean | null
  stripeRequirementsDue: number | null
  stripeBankName: string | null
  stripeBankLast4: string | null
  stripeSyncedAt: Date | null
}

export interface StatementSnapshot {
  number: string
  period: string
  periodLabel: string
  issuedAt: string
  dueDate: string
  supplier: {
    curatorId: string
    name: string
    tradingName: string | null
    abn: string | null
    address: string | null
    email: string
    gstRegistered: boolean
    taxStatus: TaxStatus | null
  }
  recipient: { name: string; legalName: string; abn: string; address: string | null; email: string }
  lines: StatementLine[]
  totals: { grossCents: number; netCents: number; poolCents: number; royaltyCents: number; gstCents: number; withholdingCents: number; payableCents: number }
  invoiceKind: InvoiceKind
  gstApplies: boolean
  /** Masked: bank name and last four digits, from Stripe. Nothing more is stored. */
  bank: { bankName: string | null; last4: string } | null
  rctiAgreementAt: string | null
  pointsAsAt: string
  sources: { stripe: boolean; estimated: boolean }
}

/** Things to sort out before paying someone, most important first. */
export function paymentIssues(c: PaymentCurator): string[] {
  const issues: string[] = []
  if (c.identityStatus !== "verified") issues.push(c.identityStatus === "processing" ? "Identity being checked" : "Identity not verified")
  if (!c.taxStatus) issues.push("Tax status not set")
  if (c.taxStatus === "abn" && !isValidAbn(c.abn)) issues.push("ABN missing or invalid")
  if (c.taxStatus === "abn" && !c.rctiAgreementAt) issues.push("No signed RCTI agreement")
  if (c.taxStatus === "hobby" && !c.hobbyFormAt) issues.push("Hobby form not recorded")
  const payouts = payoutAccountStatus(c)
  if (payouts === "none") issues.push("Hasn’t set up Stripe payouts")
  if (payouts === "incomplete") issues.push("Stripe payout setup unfinished")
  if (payouts === "pending") issues.push("Stripe still verifying")
  return issues
}

const displayName = (c: PaymentCurator) => c.legalName?.trim() || `${c.firstName} ${c.lastName}`.trim()

function snapshotFor(
  c: PaymentCurator,
  period: string,
  number: string,
  totals: ReturnType<typeof computeStatement>,
  sources: StatementSnapshot["sources"],
  issuedAt = new Date(),
): StatementSnapshot {
  return {
    number,
    period,
    periodLabel: periodLabel(period),
    issuedAt: issuedAt.toISOString(),
    dueDate: paymentDueDate(period).toISOString(),
    supplier: {
      curatorId: c.id,
      name: displayName(c),
      tradingName: c.tradingName,
      abn: c.taxStatus === "abn" ? c.abn : null,
      address: c.address,
      email: c.email,
      gstRegistered: !!c.gstRegistered,
      taxStatus: (c.taxStatus as TaxStatus) ?? null,
    },
    recipient: { name: BUSINESS.tradingName, legalName: BUSINESS.legalName, abn: BUSINESS.abn, address: BUSINESS.address, email: BUSINESS.email },
    lines: totals.lines,
    totals: {
      grossCents: totals.grossCents,
      netCents: totals.netCents,
      poolCents: totals.poolCents,
      royaltyCents: totals.royaltyCents,
      gstCents: totals.gstCents,
      withholdingCents: totals.withholdingCents,
      payableCents: totals.payableCents,
    },
    invoiceKind: totals.invoiceKind,
    gstApplies: totals.gstApplies,
    bank: c.stripeBankLast4 ? { bankName: c.stripeBankName, last4: c.stripeBankLast4 } : null,
    rctiAgreementAt: c.rctiAgreementAt?.toISOString() ?? null,
    pointsAsAt: issuedAt.toISOString(),
    sources,
  }
}

/** Everything the payouts page needs for a month, worked out live. */
export async function computePeriod(period: string, { refresh = false } = {}) {
  const range = periodRange(period)
  if (!range) return null

  // Keep payout account status current without calling Stripe for everyone on every view.
  await syncStale(await prisma.curator.findMany({ select: { stripeAccountId: true, stripeSyncedAt: true } }), refresh ? 0 : 60 * 60_000)

  const [sales, { tally }, curators, statements] = await Promise.all([
    subjectSalesFor(range.start, range.end, { refresh }),
    contentBySubject(),
    prisma.curator.findMany({ select: PAYMENT_SELECT, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
    prisma.royaltyStatement.findMany({ where: { period } }),
  ])
  const statementBy = new Map(statements.map((s) => [s.curatorId, s]))
  const sources = { stripe: sales.stripe.ok, estimated: sales.lines.some((l) => l.source === "estimate") }

  const rows = curators.map((c) => {
    const mine = tally.byEarner.get(c.id) ?? new Map<string, number>()
    const totals = computeStatement({
      subjects: [...mine].map(([subjectId, myPoints]) => ({
        subjectId,
        name: SUBJECTS.find((s) => s.id === subjectId)?.name ?? subjectId,
        grossCents: sales.bySubject.get(subjectId)?.grossCents ?? 0,
        netCents: sales.bySubject.get(subjectId)?.netCents ?? 0,
        myPoints,
        totalPoints: tally.total.get(subjectId) ?? 0,
      })),
      taxStatus: (c.taxStatus as TaxStatus) ?? null,
      gstRegistered: !!c.gstRegistered,
      aviprepGstRegistered: aviprepGstRegistered(),
      hasRctiAgreement: !!c.rctiAgreementAt,
    })
    const statement = statementBy.get(c.id)
    return {
      curator: c,
      totals,
      issues: paymentIssues(c),
      points: [...mine.values()].reduce((n, p) => n + p, 0),
      statement: statement
        ? {
            id: statement.id,
            number: statement.number,
            status: statement.status,
            royaltyCents: statement.royaltyCents,
            gstCents: statement.gstCents,
            withholdingCents: statement.withholdingCents,
            payableCents: statement.payableCents,
            invoiceKind: statement.invoiceKind,
            generatedAt: statement.generatedAt,
            sentAt: statement.sentAt,
            sentTo: statement.sentTo,
            paidAt: statement.paidAt,
            paymentReference: statement.paymentReference,
            stripeTransferId: statement.stripeTransferId,
            transferError: statement.transferError,
            autoGenerated: !!statement.autoGenerated,
          }
        : null,
    }
  })

  return {
    period,
    label: periodLabel(period),
    range,
    monthComplete: Date.now() >= range.end.getTime(),
    dueDate: paymentDueDate(period),
    rows,
    stripe: sales.stripe,
    sources,
    snapshotFor: (curatorId: string, number: string) => {
      const row = rows.find((r) => r.curator.id === curatorId)
      return row ? snapshotFor(row.curator, period, number, row.totals, sources) : null
    },
  }
}

const numberFor = (period: string, seq: number) => `AVP-${period.replace("-", "")}-${String(seq).padStart(3, "0")}`

async function nextSequence(period: string) {
  const existing = await prisma.royaltyStatement.findMany({ where: { period }, select: { number: true } })
  // "AVP-202609-003" -> 3
  const used = existing.map((s) => Number(s.number.split("-")[2]) || 0)
  return (used.length ? Math.max(...used) : 0) + 1
}

/**
 * Creates or refreshes draft statements for the month. Sent and paid ones are
 * left alone; a voided one gets a fresh number, since its old one was issued.
 */
export async function generateStatements(period: string, generatedBy: { userId: string } | null, curatorIds?: string[]) {
  const data = await computePeriod(period, { refresh: true })
  if (!data) return null

  let created = 0
  let refreshed = 0
  let skipped = 0
  let seq = await nextSequence(period)

  for (const row of data.rows) {
    if (curatorIds && !curatorIds.includes(row.curator.id)) continue
    const existing = row.statement
    if (existing && (existing.status === "sent" || existing.status === "paid")) {
      skipped += 1
      continue
    }
    // Nobody earned anything and nothing's on record: no statement needed.
    if (!existing && row.totals.royaltyCents <= 0) continue

    const number = existing && existing.status === "draft" ? existing.number : numberFor(period, seq++)
    const snapshot = snapshotFor(row.curator, period, number, row.totals, data.sources)
    const fields = {
      number,
      status: "draft",
      snapshot: snapshot as unknown as object,
      royaltyCents: row.totals.royaltyCents,
      gstCents: row.totals.gstCents,
      withholdingCents: row.totals.withholdingCents,
      payableCents: row.totals.payableCents,
      invoiceKind: row.totals.invoiceKind,
      generatedById: generatedBy?.userId ?? null,
      autoGenerated: !generatedBy,
      generatedAt: new Date(),
      sentAt: null,
      sentTo: null,
      paidAt: null,
      paymentReference: null,
      stripeTransferId: null,
      transferError: null,
      voidedAt: null,
    }
    if (existing) {
      await prisma.royaltyStatement.update({ where: { id: existing.id }, data: fields })
      refreshed += 1
    } else {
      await prisma.royaltyStatement.create({ data: { ...fields, curatorId: row.curator.id, period } })
      created += 1
    }
  }
  return { created, refreshed, skipped }
}

/** Royalties already sent or paid this financial year, before the given period. */
export async function financialYearToDate(curatorId: string, period: string) {
  const fy = financialYearPeriods(period)
  const earlier = fy.periods.filter((p) => p !== period)
  const statements = earlier.length
    ? await prisma.royaltyStatement.findMany({
        where: { curatorId, period: { in: earlier }, status: { in: ["sent", "paid"] } },
        select: { royaltyCents: true, gstCents: true, withholdingCents: true, payableCents: true },
      })
    : []
  return {
    label: fy.label,
    royaltyCents: statements.reduce((n, s) => n + s.royaltyCents, 0),
    withholdingCents: statements.reduce((n, s) => n + s.withholdingCents, 0),
    payableCents: statements.reduce((n, s) => n + s.payableCents, 0),
  }
}

export const isPeriod = (value: unknown): value is string => typeof value === "string" && !!parsePeriod(value)
