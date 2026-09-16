import "server-only"

import { prisma } from "@lib/prisma"
import { SUBJECTS } from "@lib/subjects"

/**
 * Royalty estimates for the curator dashboard, following the Contractor
 * Agreement (section 3):
 *
 *   payout = 25% of a subject's net revenue × your active points ÷ all active points
 *
 * summed over the subjects you've written for.
 *
 * It's an estimate, and the dashboard says so. The real statement is worked out
 * from Stripe at month end. Here:
 * - Revenue is the Purchase records from the last 30 days, projected forward as
 *   next month's.
 * - Net = price less GST and an estimated Stripe fee. Refunds aren't recorded
 *   on Purchase, so they aren't taken off.
 * - A bundle writes one Purchase per subject, each carrying the full bundle
 *   price, so its price is split evenly across those rows.
 * - "All active points" counts every live question and lesson in the subject,
 *   whoever wrote it, as the agreement's formula does.
 */

export const ROYALTY_SHARE = 0.25
export const WINDOW_DAYS = 30
/** Prices include GST. Set AVIPREP_GST_REGISTERED=false if AviPrep isn't registered. */
const GST_DIVISOR = process.env.AVIPREP_GST_REGISTERED === "false" ? 1 : 1.1
/** Stripe's standard Australian card rate. */
const STRIPE_PERCENT = 0.0175
const STRIPE_FIXED_CENTS = 30

export const POINTS = { question: 1, complexQuestion: 3, lesson: 10 } as const

/** Question points: 3 when marked complex, otherwise 1. */
export const questionPoints = (points: number | null | undefined) => (points === POINTS.complexQuestion ? POINTS.complexQuestion : POINTS.question)

const liveQuestion = { OR: [{ status: "published" }, { status: null }, { status: { isSet: false } }] }

export interface SubjectEstimate {
  subjectId: string
  name: string
  myPoints: number
  totalPoints: number
  /** Net revenue over the window, in cents. */
  netCents: number
  estimateCents: number
}

export interface RoyaltyEstimate {
  estimateCents: number
  myPoints: number
  windowDays: number
  subjects: SubjectEstimate[]
}

/** Net revenue per subject over the window, in cents. */
async function netRevenueBySubject(subjectIds: string[], since: Date) {
  const purchases = await prisma.purchase.findMany({
    where: {
      purchasedAt: { gte: since },
      purchaseType: { in: ["individual", "bundle"] },
      priceAud: { gt: 0 },
    },
    select: { subjectId: true, priceAud: true, purchaseType: true, stripePaymentId: true },
  })

  // Rows per payment, so a bundle's price and fee are shared across its subjects.
  const rowsPerPayment = new Map<string, number>()
  for (const p of purchases) {
    if (p.purchaseType === "bundle" && p.stripePaymentId) {
      rowsPerPayment.set(p.stripePaymentId, (rowsPerPayment.get(p.stripePaymentId) ?? 0) + 1)
    }
  }

  const wanted = new Set(subjectIds)
  const net = new Map<string, number>()
  for (const p of purchases) {
    if (!wanted.has(p.subjectId)) continue
    const rows = p.purchaseType === "bundle" && p.stripePaymentId ? rowsPerPayment.get(p.stripePaymentId) ?? 1 : 1
    const gross = p.priceAud
    const fee = gross * STRIPE_PERCENT + STRIPE_FIXED_CENTS
    const value = (gross / GST_DIVISOR - fee) / rows
    net.set(p.subjectId, (net.get(p.subjectId) ?? 0) + Math.max(0, value))
  }
  return net
}

/** Active points per subject: everyone's, and this curator's. */
async function pointsBySubject(curatorId: string) {
  const [questions, liveCourses] = await Promise.all([
    prisma.question.findMany({ where: liveQuestion, select: { subjectId: true, points: true, authorId: true } }),
    prisma.course.findMany({
      where: { isPublished: true },
      select: { subjectId: true, modules: { select: { lessons: { select: { authorId: true } } } } },
    }),
  ])

  const total = new Map<string, number>()
  const mine = new Map<string, number>()
  const add = (subjectId: string, points: number, authorId: string | null) => {
    total.set(subjectId, (total.get(subjectId) ?? 0) + points)
    if (authorId === curatorId) mine.set(subjectId, (mine.get(subjectId) ?? 0) + points)
  }

  for (const q of questions) add(q.subjectId, questionPoints(q.points), q.authorId)
  for (const course of liveCourses) {
    for (const mod of course.modules) for (const lesson of mod.lessons) add(course.subjectId, POINTS.lesson, lesson.authorId)
  }
  return { total, mine }
}

export async function estimateRoyalties(curatorId: string): Promise<RoyaltyEstimate> {
  const { total, mine } = await pointsBySubject(curatorId)
  const subjectIds = [...mine.keys()]
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000)
  const net = subjectIds.length ? await netRevenueBySubject(subjectIds, since) : new Map<string, number>()

  const subjects = subjectIds
    .map((subjectId) => {
      const myPoints = mine.get(subjectId) ?? 0
      const totalPoints = total.get(subjectId) ?? 0
      const netCents = Math.round(net.get(subjectId) ?? 0)
      const estimateCents = totalPoints ? Math.round((netCents * ROYALTY_SHARE * myPoints) / totalPoints) : 0
      return {
        subjectId,
        name: SUBJECTS.find((s) => s.id === subjectId)?.name ?? subjectId,
        myPoints,
        totalPoints,
        netCents,
        estimateCents,
      }
    })
    .sort((a, b) => b.estimateCents - a.estimateCents || b.myPoints - a.myPoints)

  return {
    estimateCents: subjects.reduce((n, s) => n + s.estimateCents, 0),
    myPoints: subjects.reduce((n, s) => n + s.myPoints, 0),
    windowDays: WINDOW_DAYS,
    subjects,
  }
}
