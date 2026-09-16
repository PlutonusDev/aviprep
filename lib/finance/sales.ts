import "server-only"

import { prisma } from "@lib/prisma"
import { LICENSE_TYPES, SUBJECTS } from "@lib/subjects"
import { tallyByEarner } from "@lib/curators/points"
import { aviprepGstRegistered } from "./business"
import { ROYALTY_SHARE, periodLabel, periodRange, saleLines, shiftPeriod, summariseSales, type SaleLine, type SubjectSales, type Tier } from "./money"
import { stripeActuals } from "./stripe-sales"

/**
 * The sales report: per subject, licence subtotals and totals for a range of
 * months, with the royalty pool and how much of it curators earn. Payouts use
 * the same subject figures (subjectSalesFor), so the two pages always agree.
 */

const liveQuestion = { OR: [{ status: "published" }, { status: null }, { status: { isSet: false } }] }

export interface RangeSales {
  start: Date
  end: Date
  lines: SaleLine[]
  bySubject: Map<string, SubjectSales>
  unmatched: { count: number; grossCents: number; refundedCents: number; feeCents: number }
  stripe: { ok: boolean; error?: string; fetchedAt: Date }
}

/** Every paid sale between start and end, with Stripe's amounts wherever Stripe has them. */
export async function subjectSalesFor(start: Date, end: Date, { refresh = false } = {}): Promise<RangeSales> {
  const stripe = await stripeActuals(start, end, { refresh })
  const paymentIds = [...stripe.actuals.keys()]

  const purchases = await prisma.purchase.findMany({
    where: {
      OR: [{ purchasedAt: { gte: start, lt: end } }, ...(paymentIds.length ? [{ stripePaymentId: { in: paymentIds } }] : [])],
    },
    select: { subjectId: true, subjectCode: true, priceAud: true, purchaseType: true, stripePaymentId: true, purchasedAt: true },
  })

  const lines = saleLines(purchases, aviprepGstRegistered(), stripe.actuals).filter((l) => l.purchasedAt >= start && l.purchasedAt < end)

  // Charges in the range no purchase explains: renewals, add-ons bought alone, manual invoices.
  const matched = new Set(purchases.map((p) => p.stripePaymentId).filter(Boolean))
  const loose = stripe.charges.filter((c) => !c.paymentIntentId || !matched.has(c.paymentIntentId))

  return {
    start,
    end,
    lines,
    bySubject: summariseSales(lines),
    unmatched: {
      count: loose.length,
      grossCents: loose.reduce((n, c) => n + c.chargedCents - c.refundedCents, 0),
      refundedCents: loose.reduce((n, c) => n + c.refundedCents, 0),
      feeCents: loose.reduce((n, c) => n + c.feeCents, 0),
    },
    stripe: { ok: stripe.ok, error: stripe.error, fetchedAt: stripe.fetchedAt },
  }
}

/** Live content and points, now, per subject. Everyone's, and the share held by curators. */
export async function contentBySubject() {
  const [questions, liveCourses, credits, curators] = await Promise.all([
    prisma.question.findMany({ where: liveQuestion, select: { id: true, subjectId: true, points: true, authorId: true } }),
    prisma.course.findMany({
      where: { isPublished: true },
      select: { id: true, subjectId: true, modules: { select: { lessons: { select: { id: true, authorId: true } } } } },
    }),
    prisma.contentCredit.findMany({ select: { contentType: true, contentId: true, curatorId: true, points: true } }),
    prisma.curator.findMany({ select: { id: true } }),
  ])
  const tally = tallyByEarner({ questions, liveCourses, credits })
  const curatorIds = new Set(curators.map((c) => c.id))

  const content = new Map<string, { questions: number; lessons: number; points: number; curatorPoints: number }>()
  const entry = (id: string) => {
    const e = content.get(id) ?? { questions: 0, lessons: 0, points: 0, curatorPoints: 0 }
    content.set(id, e)
    return e
  }
  for (const q of questions) entry(q.subjectId).questions += 1
  for (const c of liveCourses) entry(c.subjectId).lessons += c.modules.reduce((n, m) => n + m.lessons.length, 0)
  for (const [subjectId, points] of tally.total) entry(subjectId).points = points
  for (const [earnerId, subjects] of tally.byEarner) {
    if (!curatorIds.has(earnerId)) continue
    for (const [subjectId, points] of subjects) entry(subjectId).curatorPoints += points
  }
  return { content, tally, curatorIds }
}

const emptyTiers = (): Record<Tier, { units: number; grossCents: number }> => ({
  "exams-only": { units: 0, grossCents: 0 },
  "with-learning": { units: 0, grossCents: 0 },
  bundle: { units: 0, grossCents: 0 },
})

export interface SalesRow {
  subjectId: string
  name: string
  code: string
  licence: string
  units: number
  orders: number
  byTier: Record<Tier, { units: number; grossCents: number }>
  grossCents: number
  refundedCents: number
  gstCents: number
  feeCents: number
  netCents: number
  poolCents: number
  /** Pool earned by curators, by their share of the subject's points. */
  curatorRoyaltyCents: number
  retainedCents: number
  questions: number
  lessons: number
  points: number
  curatorPoints: number
  estimated: boolean
}

type Totals = Omit<SalesRow, "subjectId" | "name" | "code" | "licence" | "estimated">

function addUp(rows: SalesRow[]): Totals {
  const t: Totals = {
    units: 0,
    orders: 0,
    byTier: emptyTiers(),
    grossCents: 0,
    refundedCents: 0,
    gstCents: 0,
    feeCents: 0,
    netCents: 0,
    poolCents: 0,
    curatorRoyaltyCents: 0,
    retainedCents: 0,
    questions: 0,
    lessons: 0,
    points: 0,
    curatorPoints: 0,
  }
  for (const r of rows) {
    for (const k of ["units", "orders", "grossCents", "refundedCents", "gstCents", "feeCents", "netCents", "poolCents", "curatorRoyaltyCents", "retainedCents", "questions", "lessons", "points", "curatorPoints"] as const) {
      t[k] += r[k]
    }
    for (const tier of Object.keys(t.byTier) as Tier[]) {
      t.byTier[tier].units += r.byTier[tier].units
      t.byTier[tier].grossCents += r.byTier[tier].grossCents
    }
  }
  return t
}

export async function salesReport(from: string, to: string, { refresh = false } = {}) {
  const first = periodRange(from)
  const last = periodRange(to)
  if (!first || !last || first.start >= last.end) return null

  const [sales, { content }] = await Promise.all([subjectSalesFor(first.start, last.end, { refresh }), contentBySubject()])

  const subjectIds = new Set([...sales.bySubject.keys(), ...[...content.entries()].filter(([, c]) => c.questions || c.lessons).map(([id]) => id)])
  const rows: SalesRow[] = [...subjectIds].map((subjectId) => {
    const s = sales.bySubject.get(subjectId)
    const c = content.get(subjectId) ?? { questions: 0, lessons: 0, points: 0, curatorPoints: 0 }
    const subject = SUBJECTS.find((x) => x.id === subjectId)
    const netCents = s?.netCents ?? 0
    const poolCents = netCents * ROYALTY_SHARE
    const curatorRoyaltyCents = c.points > 0 ? (poolCents * c.curatorPoints) / c.points : 0
    return {
      subjectId,
      name: subject?.name ?? subjectId,
      code: subject?.code ?? "",
      licence: subject?.licenseType ?? "other",
      units: s?.units ?? 0,
      orders: s?.orders ?? 0,
      byTier: s?.byTier ?? emptyTiers(),
      grossCents: s?.grossCents ?? 0,
      refundedCents: s?.refundedCents ?? 0,
      gstCents: s?.gstCents ?? 0,
      feeCents: s?.feeCents ?? 0,
      netCents,
      poolCents,
      curatorRoyaltyCents,
      retainedCents: netCents - poolCents,
      questions: c.questions,
      lessons: c.lessons,
      points: c.points,
      curatorPoints: c.curatorPoints,
      estimated: (s?.estimatedUnits ?? 0) > 0,
    }
  })

  // A bundle is one order across several subjects, so subtotals count payments, not rows.
  const distinctOrders = (subjectIds: string[]) => {
    const wanted = new Set(subjectIds)
    return new Set(sales.lines.filter((l) => wanted.has(l.subjectId)).map((l) => l.paymentId)).size
  }

  const licences = LICENSE_TYPES.map((l) => ({ id: l.id as string, name: l.name, fullName: l.fullName }))
    .concat([{ id: "other", name: "Other", fullName: "Other" }])
    .map((l) => {
      const inLicence = rows
        .filter((r) => r.licence === l.id)
        .sort((a, b) => b.grossCents - a.grossCents || a.name.localeCompare(b.name))
      return { ...l, rows: inLicence, subtotal: { ...addUp(inLicence), orders: distinctOrders(inLicence.map((r) => r.subjectId)) } }
    })
    .filter((l) => l.rows.length)

  // Revenue over time: by day for up to two months, otherwise by month.
  const days = (last.end.getTime() - first.start.getTime()) / 86_400_000
  const byMonth = days > 62
  const buckets = new Map<string, { grossCents: number; netCents: number; units: number }>()
  const bucketKey = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", ...(byMonth ? {} : { day: "2-digit" }) }).format(d)
  if (byMonth) {
    for (let p = from; p <= to; p = shiftPeriod(p, 1)) buckets.set(p, { grossCents: 0, netCents: 0, units: 0 })
  } else {
    // Midday steps, so a daylight saving change never skips or repeats a day.
    for (let t = first.start.getTime() + 43_200_000; t < last.end.getTime(); t += 86_400_000) {
      buckets.set(bucketKey(new Date(t)), { grossCents: 0, netCents: 0, units: 0 })
    }
  }
  for (const l of sales.lines) {
    const b = buckets.get(bucketKey(l.purchasedAt)) ?? { grossCents: 0, netCents: 0, units: 0 }
    b.grossCents += l.grossCents
    b.netCents += l.netCents
    b.units += l.units
    buckets.set(bucketKey(l.purchasedAt), b)
  }

  return {
    from,
    to,
    label: from === to ? periodLabel(from) : `${periodLabel(from)} to ${periodLabel(to)}`,
    licences,
    totals: { ...addUp(rows), orders: new Set(sales.lines.map((l) => l.paymentId)).size },
    unmatched: sales.unmatched,
    series: { unit: byMonth ? ("month" as const) : ("day" as const), points: [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v })) },
    stripe: sales.stripe,
    gstRegistered: aviprepGstRegistered(),
    estimatedLines: sales.lines.filter((l) => l.source === "estimate").length,
  }
}

export type SalesReport = NonNullable<Awaited<ReturnType<typeof salesReport>>>
