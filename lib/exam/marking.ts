/**
 * Marking an answer, and reading what a student typed.
 *
 * Pure, and shared by the exam screen, the results review and anything server
 * side that needs to score an attempt - so a question can never be marked one
 * way on screen and another way in the record.
 */

export type AnswerType = "choice" | "numeric"
export type ToleranceType = "percent" | "absolute"

/** Null reads as multiple choice: the bank predates the field. */
export const answerTypeOf = (q: { answerType?: string | null }): AnswerType =>
  q.answerType === "numeric" ? "numeric" : "choice"

export interface NumericSpec {
  answerValue?: number | null
  answerUnit?: string | null
  tolerance?: number | null
  toleranceType?: string | null
}

export interface MarkableQuestion extends NumericSpec {
  answerType?: string | null
  correctIndex?: number | null
}

/**
 * What a student is allowed to type: a number, with the things people actually
 * put around numbers. Commas and spaces group digits, the unit may be repeated
 * back at us, and a minus sign may be a dash they copied from a chart.
 *
 * Returns null when it isn't a number, which is not the same as being wrong -
 * the caller decides whether that's unanswered or incorrect.
 */
export function parseNumericAnswer(input: string | null | undefined): number | null {
  if (typeof input !== "string") return null

  const cleaned = input
    .trim()
    .replace(/[−‒–—]/g, "-") // minus sign and dashes
    .replace(/[,\s_]/g, "")
    // Anything trailing that isn't part of a number: "kt", "ft", "°", "%".
    .replace(/[^0-9.+-].*$/, "")

  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

/**
 * How far out an answer may be, as an absolute amount.
 *
 * A percentage of zero is zero, which would make a question with a correct
 * answer of 0 unanswerable. That's an authoring mistake, caught by validation;
 * here it simply means only exactly 0 is accepted.
 */
export function toleranceAmount(q: NumericSpec): number {
  const tolerance = Math.abs(q.tolerance ?? 0)
  if (!tolerance) return 0
  return q.toleranceType === "absolute" ? tolerance : (Math.abs(q.answerValue ?? 0) * tolerance) / 100
}

/** The accepted range, for showing a student why they were marked as they were. */
export function toleranceBand(q: NumericSpec): { min: number; max: number } | null {
  if (typeof q.answerValue !== "number") return null
  const amount = toleranceAmount(q)
  return { min: q.answerValue - amount, max: q.answerValue + amount }
}

/** Trailing zeros dropped, thousands grouped: 1,200 rather than 1200.00. */
export function formatValue(value: number, unit?: string | null) {
  const rounded = Math.abs(value) >= 1000 ? Math.round(value * 100) / 100 : Math.round(value * 10000) / 10000
  const text = rounded.toLocaleString("en-AU", { maximumFractionDigits: 4 })
  return unit?.trim() ? `${text} ${unit.trim()}` : text
}

/** "±5%" or "±2 kt", for the editor and the results screen. */
export function formatTolerance(q: NumericSpec): string {
  const tolerance = Math.abs(q.tolerance ?? 0)
  if (!tolerance) return "exact"
  if (q.toleranceType === "absolute") return `±${formatValue(tolerance, q.answerUnit)}`
  return `±${tolerance}%`
}

/**
 * A student's answer: the shown option index for multiple choice, or what they
 * typed for a numeric one. Null is unanswered.
 */
export type StudentAnswer = number | string | null

export const isAnswered = (answer: StudentAnswer) =>
  typeof answer === "number" ? true : typeof answer === "string" && answer.trim().length > 0

/**
 * `correctIndex` is the index as shown, since options are shuffled per exam.
 * Whoever marks has to pass the question in the same shape the student saw it.
 */
export function isAnswerCorrect(q: MarkableQuestion, answer: StudentAnswer): boolean {
  if (!isAnswered(answer)) return false

  if (answerTypeOf(q) === "numeric") {
    const given = parseNumericAnswer(typeof answer === "string" ? answer : String(answer))
    if (given === null || typeof q.answerValue !== "number") return false
    // A hair of slack for binary floating point: 0.1 + 0.2 shouldn't fail a
    // question whose tolerance is exactly 0.3.
    const amount = toleranceAmount(q)
    return Math.abs(given - q.answerValue) <= amount + Math.abs(q.answerValue) * 1e-9 + 1e-9
  }

  return typeof answer === "number" && answer === q.correctIndex
}

/** The tolerances offered in the editor. Anything else is typed in as absolute. */
export const TOLERANCE_PRESETS = [0, 1, 2, 5, 10] as const
