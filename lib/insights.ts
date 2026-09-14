/**
 * Decides what, if anything, a student should focus on.
 *
 * The old page simply took the lowest-scoring subject, so it always had an
 * answer - a student on 100% everywhere was told to work on something. Here a
 * subject or topic only becomes a focus when there is a real problem: below the
 * pass mark, or a clear outlier against the student's own results. And it leans
 * towards whatever the student has actually been practising lately, rather than
 * a subject they have not touched in months.
 *
 * Pure: no fetching, no React, so it can be tested directly.
 */

/** Matches the server, which marks an attempt passed at >= 70 (api/exam/complete). */
export const PASS_SCORE = 70

/** Below this many answered questions a subject average is noise, not a signal. */
export const MIN_SUBJECT_QUESTIONS = 10
/** Same idea for a topic: two wrong out of three says nothing yet. */
export const MIN_TOPIC_QUESTIONS = 4
/** How far below the student's own norm counts as a clear outlier, in points. */
export const OUTLIER_GAP = 15
/** "Working on" means practised within this window. */
export const ACTIVE_WINDOW_DAYS = 14

export interface InsightSubject {
  id: string
  name: string
  code: string
  isPurchased: boolean
  averageScore: number
  questionsAttempted: number
  examsCompleted: number
  lastAttempt?: string | Date | null
}

export interface InsightTopic {
  id: string
  topic: string
  subjectId: string
  subjectName: string
  accuracy: number
  questionsAttempted: number
}

export type FocusReason = "below-pass" | "outlier"

export interface FocusSubject {
  subject: InsightSubject
  reason: FocusReason
  /** Points below the student's average across subjects (outliers only). */
  gap: number
  isActive: boolean
}

export interface WeakTopic extends InsightTopic {
  reason: FocusReason
  isActiveSubject: boolean
}

export interface Insights {
  /** Nothing has enough data behind it to judge yet. */
  notEnoughData: boolean
  /** The subject practised most recently, if that was within the active window. */
  activeSubject: InsightSubject | null
  /** The most recently practised subject, however long ago. */
  lastPractised: InsightSubject | null
  focus: FocusSubject | null
  weakTopics: WeakTopic[]
  /** Enough data, and nothing that needs attention. */
  allClear: boolean
  averageAcrossSubjects: number | null
}

function time(value: string | Date | null | undefined): number {
  if (!value) return 0
  const t = new Date(value).getTime()
  return Number.isNaN(t) ? 0 : t
}

export function computeInsights({
  subjects,
  topics,
  now = Date.now(),
}: {
  subjects: InsightSubject[]
  topics: InsightTopic[]
  now?: number
}): Insights {
  const eligible = subjects.filter(
    (s) => s.isPurchased && s.examsCompleted > 0 && s.questionsAttempted >= MIN_SUBJECT_QUESTIONS,
  )

  const byRecency = [...eligible].sort((a, b) => time(b.lastAttempt) - time(a.lastAttempt))
  const lastPractised = byRecency[0] ?? null
  const activeSubject =
    lastPractised && now - time(lastPractised.lastAttempt) <= ACTIVE_WINDOW_DAYS * 86_400_000
      ? lastPractised
      : null

  const averageAcrossSubjects = eligible.length
    ? eligible.reduce((n, s) => n + s.averageScore, 0) / eligible.length
    : null

  const subjectNeedsWork = (s: InsightSubject): FocusReason | null => {
    if (s.averageScore < PASS_SCORE) return "below-pass"
    // An outlier needs something to stand out from.
    if (eligible.length >= 2 && averageAcrossSubjects !== null && averageAcrossSubjects - s.averageScore >= OUTLIER_GAP) {
      return "outlier"
    }
    return null
  }

  const toFocus = (s: InsightSubject): FocusSubject => ({
    subject: s,
    reason: subjectNeedsWork(s)!,
    gap: averageAcrossSubjects === null ? 0 : Math.max(0, Math.round(averageAcrossSubjects - s.averageScore)),
    isActive: activeSubject?.id === s.id,
  })

  let focus: FocusSubject | null = null
  if (activeSubject && subjectNeedsWork(activeSubject)) {
    // What they are working on right now wins, if it genuinely needs work.
    focus = toFocus(activeSubject)
  } else {
    const worst = eligible
      .filter((s) => subjectNeedsWork(s))
      .sort((a, b) => a.averageScore - b.averageScore)[0]
    if (worst) focus = toFocus(worst)
  }

  const subjectAverage = new Map(eligible.map((s) => [s.id, s.averageScore]))

  const weakTopics: WeakTopic[] = topics
    .filter((t) => t.questionsAttempted >= MIN_TOPIC_QUESTIONS)
    .map((t): WeakTopic | null => {
      let reason: FocusReason | null = null
      if (t.accuracy < PASS_SCORE) reason = "below-pass"
      else {
        const avg = subjectAverage.get(t.subjectId)
        if (avg !== undefined && avg - t.accuracy >= OUTLIER_GAP) reason = "outlier"
      }
      return reason ? { ...t, reason, isActiveSubject: t.subjectId === activeSubject?.id } : null
    })
    .filter((t): t is WeakTopic => t !== null)
    .sort((a, b) => {
      // Topics in the subject being studied now come first, then the weakest.
      if (a.isActiveSubject !== b.isActiveSubject) return a.isActiveSubject ? -1 : 1
      return a.accuracy - b.accuracy
    })

  const notEnoughData = eligible.length === 0

  return {
    notEnoughData,
    activeSubject,
    lastPractised,
    focus,
    weakTopics,
    allClear: !notEnoughData && !focus && weakTopics.length === 0,
    averageAcrossSubjects: averageAcrossSubjects === null ? null : Math.round(averageAcrossSubjects),
  }
}
