import "server-only"

import { prisma } from "@lib/prisma"
import { SUBJECTS } from "@lib/subjects"
import { subjectSalesFor } from "@lib/finance/sales"
import { shareOfPool, tallyPoints } from "./points"

export { POINTS, ROYALTY_SHARE, questionPoints } from "./points"

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
 * - Revenue is the last 30 days of sales, projected forward as next month's,
 *   from Stripe where possible (actual charges, fees and refunds), otherwise
 *   estimated from list prices. See lib/finance/money.ts.
 * - "All active points" counts every live question and lesson in the subject,
 *   whoever wrote it, as the agreement's formula does.
 * - Points are the author's base points (1 or 3 per question, 10 per lesson)
 *   plus any ContentCredit awarded for an approved edit, on live content only.
 *   A credit adds to the subject's total as well as the editor's share.
 */

export const WINDOW_DAYS = 30

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

/** Net revenue per subject over the window, in cents: Stripe's figures where it has them (lib/finance/sales.ts). */
async function netRevenueBySubject(subjectIds: string[], since: Date) {
  const sales = await subjectSalesFor(since, new Date())
  const wanted = new Set(subjectIds)
  return new Map([...sales.bySubject].filter(([id]) => wanted.has(id)).map(([id, s]) => [id, s.netCents]))
}

/** Active points per subject: everyone's, and this curator's. */
async function pointsBySubject(curatorId: string) {
  const [questions, liveCourses, credits] = await Promise.all([
    prisma.question.findMany({ where: liveQuestion, select: { id: true, subjectId: true, points: true, authorId: true } }),
    prisma.course.findMany({
      where: { isPublished: true },
      select: { id: true, subjectId: true, modules: { select: { lessons: { select: { id: true, authorId: true } } } } },
    }),
    prisma.contentCredit.findMany({ select: { contentType: true, contentId: true, curatorId: true, points: true } }),
  ])

  return tallyPoints({ questions, liveCourses, credits }, curatorId)
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
      const estimateCents = shareOfPool(netCents, myPoints, totalPoints)
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
