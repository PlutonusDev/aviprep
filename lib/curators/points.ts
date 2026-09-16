/**
 * Royalty points, pure so the rules can be tested (Contractor Agreement 3.3-3.5).
 *
 * - A live question earns its author 1 point, or 3 when marked complex.
 * - A lesson in a live course earns its author 10.
 * - An approved edit credited to someone else adds a ContentCredit's points,
 *   while the content it's on is live. Minor edits add nothing.
 * - Everyone's points count towards the subject's total, whoever wrote it.
 */

export const ROYALTY_SHARE = 0.25

export const POINTS = { question: 1, complexQuestion: 3, lesson: 10 } as const

/** Question points: 3 when marked complex, otherwise 1. */
export const questionPoints = (points: number | null | undefined) => (points === POINTS.complexQuestion ? POINTS.complexQuestion : POINTS.question)

export interface PointSources {
  /** Live questions only. */
  questions: { id: string; subjectId: string; points: number | null; authorId: string | null }[]
  /** Published courses only. */
  liveCourses: { id: string; subjectId: string; modules: { lessons: { id: string; authorId: string | null }[] }[] }[]
  credits: { contentType: string; contentId: string; curatorId: string; points: number }[]
}

export function tallyPoints({ questions, liveCourses, credits }: PointSources, curatorId: string) {
  const total = new Map<string, number>()
  const mine = new Map<string, number>()
  const add = (subjectId: string, points: number, earnerId: string | null) => {
    total.set(subjectId, (total.get(subjectId) ?? 0) + points)
    if (earnerId === curatorId) mine.set(subjectId, (mine.get(subjectId) ?? 0) + points)
  }

  // Where each piece of live content belongs, so credits on it can be counted.
  const liveSubject = new Map<string, string>()

  for (const q of questions) {
    add(q.subjectId, questionPoints(q.points), q.authorId)
    liveSubject.set(`question:${q.id}`, q.subjectId)
  }
  for (const course of liveCourses) {
    liveSubject.set(`course:${course.id}`, course.subjectId)
    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        add(course.subjectId, POINTS.lesson, lesson.authorId)
        liveSubject.set(`lesson:${lesson.id}`, course.subjectId)
      }
    }
  }
  for (const credit of credits) {
    const subjectId = liveSubject.get(`${credit.contentType}:${credit.contentId}`)
    if (subjectId && credit.points > 0) add(subjectId, credit.points, credit.curatorId)
  }
  return { total, mine }
}

/** A curator's cut of a subject's pool, in cents. */
export function shareOfPool(netCents: number, myPoints: number, totalPoints: number) {
  return totalPoints > 0 ? Math.round((netCents * ROYALTY_SHARE * myPoints) / totalPoints) : 0
}
