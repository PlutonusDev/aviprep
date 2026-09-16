/**
 * Money rules for sales reporting and royalty statements. Pure, so every
 * number on the sales page, payouts page, statements and RCTIs comes from one
 * tested place.
 *
 * Contractor Agreement:
 * - 3.2 Net revenue = gross received for a subject, less payment processing
 *   fees, taxes (GST) and refunds.
 * - 3.3 25% of a subject's net revenue goes to its content royalty pool.
 * - 3.5 A curator's royalty = pool × their active points ÷ all active points.
 *
 * Where the numbers come from:
 * - Stripe first (lib/finance/stripe-sales.ts): the amount actually charged
 *   (after coupons), refunds and Stripe's real fee, per payment.
 * - A payment Stripe doesn't know about falls back to an estimate from
 *   Purchase.priceAud, the GST-inclusive list price, and is flagged as such.
 * - A payment can cover several subjects (a bundle writes one Purchase per
 *   subject, each carrying the whole bundle price). Its amounts are shared
 *   across those subjects in proportion to their list prices.
 */

export const ROYALTY_SHARE = 0.25
export const GST_RATE = 0.1
/** Stripe's standard domestic card rate. */
export const STRIPE_PERCENT = 0.0175
export const STRIPE_FIXED_CENTS = 30
/** Withholding when a supplier doesn't quote an ABN (no hobby form), on payments over $75 ex GST. */
export const NO_ABN_WITHHOLDING = 0.47
export const NO_ABN_THRESHOLD_CENTS = 7500
export const BUSINESS_TIME_ZONE = "Australia/Sydney"

export type Tier = "exams-only" | "with-learning" | "bundle"
export type TaxStatus = "abn" | "hobby" | "no-abn"
export type InvoiceKind = "rcti" | "rci" | "none"

/* --- Periods -------------------------------------------------------------------- */

/** "2026-09" -> { year: 2026, month: 9 }, or null. */
export function parsePeriod(period: string | null | undefined) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period ?? "")
  return match ? { year: Number(match[1]), month: Number(match[2]) } : null
}

export const periodOf = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`

/** The offset (ms) of a time zone from UTC at a given instant. */
function zoneOffset(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"))
  return asUtc - instant.getTime()
}

/** The UTC instant of local midnight on the 1st of a month in the business time zone. */
export function monthStart(year: number, month: number, timeZone = BUSINESS_TIME_ZONE) {
  const guess = Date.UTC(year, month - 1, 1)
  // Two passes settle daylight saving transitions.
  let instant = guess - zoneOffset(new Date(guess), timeZone)
  instant = guess - zoneOffset(new Date(instant), timeZone)
  return new Date(instant)
}

/** [start, end) of a period in the business time zone. */
export function periodRange(period: string, timeZone = BUSINESS_TIME_ZONE) {
  const p = parsePeriod(period)
  if (!p) return null
  const next = p.month === 12 ? { year: p.year + 1, month: 1 } : { year: p.year, month: p.month + 1 }
  return { start: monthStart(p.year, p.month, timeZone), end: monthStart(next.year, next.month, timeZone) }
}

/** The period an instant falls in, in the business time zone. */
export function periodAt(instant: Date, timeZone = BUSINESS_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-AU", { timeZone, year: "numeric", month: "2-digit" }).formatToParts(instant)
  return periodOf(Number(parts.find((x) => x.type === "year")?.value), Number(parts.find((x) => x.type === "month")?.value))
}

export function shiftPeriod(period: string, months: number) {
  const p = parsePeriod(period)!
  const index = p.year * 12 + (p.month - 1) + months
  return periodOf(Math.floor(index / 12), (index % 12) + 1)
}

export function periodLabel(period: string) {
  const p = parsePeriod(period)
  if (!p) return period
  return new Date(Date.UTC(p.year, p.month - 1, 15)).toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: "UTC" })
}

/** Royalties are paid within 14 days of month end (Contractor Agreement 3.7). */
export function paymentDueDate(period: string) {
  const p = parsePeriod(period)!
  const next = p.month === 12 ? { year: p.year + 1, month: 1 } : { year: p.year, month: p.month + 1 }
  return new Date(Date.UTC(next.year, next.month - 1, 14))
}

/** The Australian financial year (1 July to 30 June) a period belongs to, as its periods. */
export function financialYearPeriods(period: string) {
  const p = parsePeriod(period)!
  const startYear = p.month >= 7 ? p.year : p.year - 1
  const periods: string[] = []
  for (let i = 0; i < 12; i++) {
    const candidate = shiftPeriod(periodOf(startYear, 7), i)
    periods.push(candidate)
    if (candidate === period) break
  }
  return { label: `FY${String(startYear + 1).slice(2)}`, periods }
}

/* --- Sales ---------------------------------------------------------------------- */

export interface PurchaseRow {
  subjectId: string
  subjectCode: string
  priceAud: number
  purchaseType: string
  stripePaymentId: string | null
  purchasedAt: Date
}

/** What Stripe says actually happened to a payment, in cents. */
export interface PaymentActual {
  chargedCents: number
  refundedCents: number
  feeCents: number
  /** When Stripe took the payment. Wins over Purchase.purchasedAt, which a renewal doesn't update. */
  chargedAt: Date
}

export interface SaleLine {
  subjectId: string
  tier: Tier
  /** A whole sale is 1; a bundle row is 1 ÷ subjects in the bundle. */
  units: number
  grossCents: number
  gstCents: number
  feeCents: number
  netCents: number
  purchasedAt: Date
  refundedCents: number
  /** The payment it came from, for counting orders. */
  paymentId: string
  /** "stripe" when the amounts are Stripe's, "estimate" when worked out from list price. */
  source: "stripe" | "estimate"
}

/** Paid purchases only: free subjects and admin grants carry no revenue. */
export const isPaid = (p: Pick<PurchaseRow, "priceAud" | "purchaseType">) =>
  p.priceAud > 0 && (p.purchaseType === "individual" || p.purchaseType === "bundle")

/** Splits a GST-inclusive amount into GST, an estimated Stripe fee and what's left. */
export function splitSale(grossCents: number, gstRegistered: boolean) {
  const gstCents = gstRegistered ? grossCents - grossCents / (1 + GST_RATE) : 0
  const feeCents = grossCents > 0 ? grossCents * STRIPE_PERCENT + STRIPE_FIXED_CENTS : 0
  return { gstCents, feeCents, netCents: Math.max(0, grossCents - gstCents - feeCents) }
}

export function saleLines(purchases: PurchaseRow[], gstRegistered: boolean, actuals: Map<string, PaymentActual> = new Map()): SaleLine[] {
  const paid = purchases.filter(isPaid)

  // Rows per payment. A bundle row's priceAud is the whole bundle, so it only counts once.
  const payments = new Map<string, { rows: number; listCents: number }>()
  paid.forEach((p, i) => {
    const id = p.stripePaymentId ?? `row-${i}`
    const entry = payments.get(id) ?? { rows: 0, listCents: 0 }
    entry.rows += 1
    entry.listCents = p.purchaseType === "bundle" ? p.priceAud : entry.listCents + p.priceAud
    payments.set(id, entry)
  })

  return paid.map((p, i) => {
    const paymentId = p.stripePaymentId ?? `row-${i}`
    const payment = payments.get(paymentId)!
    const bundle = p.purchaseType === "bundle"
    // This row's part of its payment.
    const weight = bundle ? 1 / payment.rows : payment.listCents > 0 ? p.priceAud / payment.listCents : 1 / payment.rows
    const tier: Tier = bundle ? "bundle" : p.subjectCode.endsWith("-exams") ? "exams-only" : "with-learning"
    const actual = p.stripePaymentId ? actuals.get(p.stripePaymentId) : undefined

    if (actual) {
      // Refunds reduce what counts as sold; Stripe keeps its fee on a refund.
      const keptCents = Math.max(0, actual.chargedCents - actual.refundedCents)
      const gstCents = gstRegistered ? keptCents - keptCents / (1 + GST_RATE) : 0
      return {
        subjectId: p.subjectId,
        tier,
        units: bundle ? weight : 1,
        grossCents: keptCents * weight,
        gstCents: gstCents * weight,
        feeCents: actual.feeCents * weight,
        netCents: Math.max(0, keptCents - gstCents - actual.feeCents) * weight,
        refundedCents: actual.refundedCents * weight,
        purchasedAt: actual.chargedAt,
        paymentId,
        source: "stripe" as const,
      }
    }

    // Estimate the whole payment, then share it, so the fixed fee is charged once per payment.
    const listCents = payment.listCents
    const whole = splitSale(listCents, gstRegistered)
    return {
      subjectId: p.subjectId,
      tier,
      units: bundle ? weight : 1,
      grossCents: listCents * weight,
      gstCents: whole.gstCents * weight,
      feeCents: whole.feeCents * weight,
      netCents: whole.netCents * weight,
      refundedCents: 0,
      purchasedAt: p.purchasedAt,
      paymentId,
      source: "estimate" as const,
    }
  })
}

export interface SubjectSales {
  subjectId: string
  units: number
  orders: number
  byTier: Record<Tier, { units: number; grossCents: number }>
  grossCents: number
  refundedCents: number
  gstCents: number
  feeCents: number
  netCents: number
  poolCents: number
  /** Net revenue less the royalty pool: what the subject leaves AviPrep before its own costs. */
  retainedCents: number
  /** Share of units whose amounts are estimates rather than Stripe's. */
  estimatedUnits: number
}

export function summariseSales(lines: SaleLine[]): Map<string, SubjectSales> {
  const out = new Map<string, SubjectSales & { payments: Set<string> }>()
  for (const l of lines) {
    const s =
      out.get(l.subjectId) ??
      {
        subjectId: l.subjectId,
        units: 0,
        orders: 0,
        byTier: { "exams-only": { units: 0, grossCents: 0 }, "with-learning": { units: 0, grossCents: 0 }, bundle: { units: 0, grossCents: 0 } },
        grossCents: 0,
        refundedCents: 0,
        gstCents: 0,
        feeCents: 0,
        netCents: 0,
        poolCents: 0,
        retainedCents: 0,
        estimatedUnits: 0,
        payments: new Set<string>(),
      }
    s.units += l.units
    s.byTier[l.tier].units += l.units
    s.byTier[l.tier].grossCents += l.grossCents
    s.grossCents += l.grossCents
    s.refundedCents += l.refundedCents
    if (l.source === "estimate") s.estimatedUnits += l.units
    s.gstCents += l.gstCents
    s.feeCents += l.feeCents
    s.netCents += l.netCents
    s.payments.add(l.paymentId)
    out.set(l.subjectId, s)
  }
  for (const s of out.values()) {
    s.orders = s.payments.size
    s.poolCents = s.netCents * ROYALTY_SHARE
    s.retainedCents = s.netCents - s.poolCents
  }
  return new Map([...out].map(([k, { payments: _payments, ...v }]) => [k, v]))
}

/* --- Statements ------------------------------------------------------------------ */

export interface StatementSubjectInput {
  subjectId: string
  name: string
  grossCents: number
  netCents: number
  myPoints: number
  totalPoints: number
}

export interface StatementLine extends StatementSubjectInput {
  poolCents: number
  /** 0 to 100. */
  sharePercent: number
  royaltyCents: number
}

export interface StatementTotals {
  lines: StatementLine[]
  grossCents: number
  netCents: number
  poolCents: number
  royaltyCents: number
  gstCents: number
  withholdingCents: number
  payableCents: number
  invoiceKind: InvoiceKind
  gstApplies: boolean
}

/**
 * A curator's month. Cents are whole in the result.
 * - GST is added only when both AviPrep and the curator are registered and they quote an ABN.
 * - No ABN and no hobby form: 47% withheld when the payment is over $75 ex GST, rounded down to the dollar.
 * - An RCTI needs the curator's ABN and a signed RCTI agreement; otherwise it's a statement only.
 */
export function computeStatement({
  subjects,
  taxStatus,
  gstRegistered,
  aviprepGstRegistered,
  hasRctiAgreement,
}: {
  subjects: StatementSubjectInput[]
  taxStatus: TaxStatus | null
  gstRegistered: boolean
  aviprepGstRegistered: boolean
  hasRctiAgreement: boolean
}): StatementTotals {
  const lines = subjects
    .filter((s) => s.myPoints > 0)
    .map((s) => {
      const poolCents = Math.round(s.netCents * ROYALTY_SHARE)
      const royaltyCents = s.totalPoints > 0 ? Math.round((s.netCents * ROYALTY_SHARE * s.myPoints) / s.totalPoints) : 0
      return {
        ...s,
        grossCents: Math.round(s.grossCents),
        netCents: Math.round(s.netCents),
        poolCents,
        sharePercent: s.totalPoints > 0 ? (s.myPoints / s.totalPoints) * 100 : 0,
        royaltyCents,
      }
    })
    .sort((a, b) => b.royaltyCents - a.royaltyCents || a.name.localeCompare(b.name))

  const royaltyCents = lines.reduce((n, l) => n + l.royaltyCents, 0)
  const gstApplies = taxStatus === "abn" && gstRegistered && aviprepGstRegistered
  const gstCents = gstApplies ? Math.round(royaltyCents * GST_RATE) : 0
  const withholdingCents =
    taxStatus === "no-abn" && royaltyCents > NO_ABN_THRESHOLD_CENTS ? Math.floor((royaltyCents * NO_ABN_WITHHOLDING) / 100) * 100 : 0
  const invoiceKind: InvoiceKind = taxStatus === "abn" && hasRctiAgreement ? (gstApplies ? "rcti" : "rci") : "none"

  return {
    lines,
    grossCents: lines.reduce((n, l) => n + l.grossCents, 0),
    netCents: lines.reduce((n, l) => n + l.netCents, 0),
    poolCents: lines.reduce((n, l) => n + l.poolCents, 0),
    royaltyCents,
    gstCents,
    withholdingCents,
    payableCents: royaltyCents + gstCents - withholdingCents,
    invoiceKind,
    gstApplies,
  }
}

/* --- Validation and formatting ----------------------------------------------------- */

/** ABN checksum (ATO): subtract 1 from the first digit, weight, sum, divisible by 89. */
export function isValidAbn(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\s/g, "")
  if (!/^\d{11}$/.test(digits)) return false
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
  const sum = digits.split("").reduce((n, d, i) => n + (Number(d) - (i === 0 ? 1 : 0)) * weights[i], 0)
  return sum % 89 === 0
}

export const formatAbn = (abn: string | null | undefined) => {
  const d = (abn ?? "").replace(/\D/g, "")
  return d.length === 11 ? `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}` : abn ?? ""
}

export const formatBsb = (bsb: string | null | undefined) => {
  const d = (bsb ?? "").replace(/\D/g, "")
  return d.length === 6 ? `${d.slice(0, 3)}-${d.slice(3)}` : bsb ?? ""
}

/** "••• 6789": enough to check it's the right account. */
export const maskAccount = (account: string | null | undefined) => {
  const d = (account ?? "").replace(/\D/g, "")
  return d ? `••• ${d.slice(-4)}` : ""
}

export const aud = (cents: number, options: { whole?: boolean } = {}) =>
  (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: options.whole ? 0 : 2,
    maximumFractionDigits: options.whole ? 0 : 2,
  })

export const TAX_STATUS_LABELS: Record<TaxStatus, string> = {
  abn: "ABN",
  hobby: "Hobby form",
  "no-abn": "No ABN (47% withheld)",
}

export const INVOICE_KIND_LABELS: Record<InvoiceKind, string> = {
  rcti: "Recipient created tax invoice",
  rci: "Recipient created invoice",
  none: "Statement only",
}
