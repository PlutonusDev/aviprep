/**
 * Picks the questions for a practice exam and shuffles their answers.
 *
 * Rules:
 * - Unseen questions and ones the student got wrong the last time they saw
 *   them always make the exam first.
 * - Remaining places are filled with already-correct questions, so an exam is
 *   always full length (or the whole bank, if it's smaller).
 * - Question order is always random, and so is answer order - except where an
 *   option refers to the others ("All of the above"), which only makes sense in
 *   its written position.
 *
 * Pure apart from the injected random source, so it can be tested directly.
 */

export const EXAM_LENGTH = 20

export interface BankQuestion {
  id: string
  options: string[]
  correctIndex: number
}

export interface PastResult {
  questionId?: string
  correct?: boolean
}

export type ShuffledQuestion<Q extends BankQuestion> = Q & {
  /** optionOrder[shownIndex] = index in the bank. Used to store the real choice. */
  optionOrder: number[]
}

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  // Fisher-Yates. The old `sort(() => Math.random() - 0.5)` is biased.
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Last known result per question, from attempts ordered oldest to newest.
 * A skipped question was stored as not correct, so it counts as wrong.
 */
export function lastResults(attempts: PastResult[][]): Map<string, boolean> {
  const last = new Map<string, boolean>()
  for (const results of attempts) {
    for (const r of results) {
      if (r?.questionId) last.set(r.questionId, r.correct === true)
    }
  }
  return last
}

const REFERS_TO_OTHERS =
  /\b(all|none|both|neither|any) of (the )?(above|these|those|them|the options|the answers)\b|\b(both|neither|either) [a-f]\b.*\b(and|or|nor) [a-f]\b|\b(options?|answers?) [a-f]\b/i

export function shuffleOptions<Q extends BankQuestion>(q: Q, random: () => number = Math.random): ShuffledQuestion<Q> {
  const identity = q.options.map((_, i) => i)
  const pinned = q.options.some((o) => REFERS_TO_OTHERS.test(o))
  const order = pinned ? identity : shuffle(identity, random)
  return {
    ...q,
    options: order.map((i) => q.options[i]),
    correctIndex: order.indexOf(q.correctIndex),
    optionOrder: order,
  }
}

export function selectExamQuestions<Q extends BankQuestion>({
  bank,
  history,
  length = EXAM_LENGTH,
  random = Math.random,
}: {
  bank: Q[]
  history: Map<string, boolean>
  length?: number
  random?: () => number
}): { questions: ShuffledQuestion<Q>[]; unseen: number; lastWrong: number; allSeen: boolean } {
  const unseen = bank.filter((q) => !history.has(q.id))
  const wrong = bank.filter((q) => history.get(q.id) === false)
  const right = bank.filter((q) => history.get(q.id) === true)
  const allSeen = unseen.length === 0

  // Unseen and last-wrong questions always go in first. Any room left is
  // filled with questions already answered correctly, so exams stay full length.
  const lead = shuffle([...unseen, ...wrong], random).slice(0, length)
  const fill = shuffle(right, random).slice(0, length - lead.length)
  // Mixed, so the priority questions aren't all bunched at the start.
  const picked = shuffle([...lead, ...fill], random)

  return {
    questions: picked.map((q) => shuffleOptions(q, random)),
    unseen: unseen.length,
    lastWrong: wrong.length,
    allSeen,
  }
}
