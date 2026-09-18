import { answerTypeOf, type AnswerType } from "@lib/exam/marking"

/**
 * One set of authoring rules, used by both the editor and the API. Keeping them
 * here is what stops the client showing a green tick for something the server
 * would reject - and stops a bad question reaching the question bank at all.
 */

export type QuestionStatus = "draft" | "review" | "published" | "rejected"

export const QUESTION_STATUSES: { id: QuestionStatus; label: string; description: string }[] = [
  { id: "draft", label: "Draft", description: "Being written. Never shown to students." },
  { id: "review", label: "In review", description: "Ready for a second pair of eyes." },
  { id: "published", label: "Published", description: "Live in practice exams." },
  { id: "rejected", label: "Rejected", description: "Declined in review. Never shown to students." },
]

/** Legacy rows predate the status field; they were already live. */
export function effectiveStatus(status?: string | null): QuestionStatus {
  if (status === "draft" || status === "review" || status === "published" || status === "rejected") return status
  return "published"
}

export const DIFFICULTIES = ["easy", "medium", "hard"] as const

export const ANSWER_TYPES: { id: AnswerType; label: string; description: string }[] = [
  { id: "choice", label: "Multiple choice", description: "Lettered options, one correct." },
  { id: "numeric", label: "Typed answer", description: "A value, marked within a tolerance." },
]

export interface QuestionDraft {
  subjectId: string
  topic: string
  difficulty: string
  questionText: string
  /** A chart or diagram the question is asked about. */
  imageUrl?: string | null
  imageAlt?: string | null
  /** "choice" | "numeric". Undefined reads as multiple choice. */
  answerType?: string | null
  options: string[]
  correctIndex: number
  /** Numeric answers. */
  answerValue?: number | null
  answerUnit?: string | null
  tolerance?: number | null
  toleranceType?: string | null
  explanation: string
  reference?: string
  status?: string | null
}

export type FieldErrors = Partial<Record<keyof QuestionDraft | `option-${number}`, string>>

export const MAX_UNIT = 12

export const MIN_OPTIONS = 2
export const MAX_OPTIONS = 6

/**
 * Errors block saving. Publishing additionally requires everything a student
 * needs to learn from a wrong answer, which is why explanation is strict here.
 */
export function validateQuestion(q: QuestionDraft): FieldErrors {
  const errors: FieldErrors = {}

  if (!q.subjectId?.trim()) errors.subjectId = "Choose a subject."
  if (!q.topic?.trim()) errors.topic = "A topic is required so the question can be grouped."
  if (!DIFFICULTIES.includes(q.difficulty as (typeof DIFFICULTIES)[number])) {
    errors.difficulty = "Choose a difficulty."
  }

  const text = q.questionText?.trim() ?? ""
  if (text.length < 10) errors.questionText = "Write the full question (at least 10 characters)."

  // An image nobody can see is an image half the students can't answer from.
  if (q.imageUrl?.trim() && !q.imageAlt?.trim()) {
    errors.imageAlt = "Describe the image, for students using a screen reader."
  }

  if (answerTypeOf(q) === "numeric") {
    if (typeof q.answerValue !== "number" || !Number.isFinite(q.answerValue)) {
      errors.answerValue = "Give the correct value."
    }

    const tolerance = q.tolerance ?? 0
    if (!Number.isFinite(tolerance) || tolerance < 0) {
      errors.tolerance = "A tolerance can't be negative."
    } else if (q.toleranceType === "percent" && tolerance > 0 && q.answerValue === 0) {
      // A percentage of zero is zero, so the question would accept nothing but 0.
      errors.tolerance = "A percentage of zero is zero. Use an exact amount instead."
    }

    if (q.answerUnit && q.answerUnit.trim().length > MAX_UNIT) {
      errors.answerUnit = `Keep the unit under ${MAX_UNIT} characters.`
    }
  } else {
    const options = q.options ?? []
    if (options.length < MIN_OPTIONS) {
      errors.options = `At least ${MIN_OPTIONS} options are needed.`
    } else if (options.length > MAX_OPTIONS) {
      errors.options = `No more than ${MAX_OPTIONS} options.`
    }

    options.forEach((opt, i) => {
      if (!opt?.trim()) errors[`option-${i}`] = "Options cannot be blank."
    })

    // Two identical options make one of them unmarkable.
    const seen = new Map<string, number>()
    options.forEach((opt, i) => {
      const key = opt?.trim().toLowerCase()
      if (!key) return
      if (seen.has(key)) errors[`option-${i}`] = "Duplicates another option."
      else seen.set(key, i)
    })

    if (
      q.correctIndex === undefined ||
      q.correctIndex === null ||
      q.correctIndex < 0 ||
      q.correctIndex >= options.length
    ) {
      errors.correctIndex = "Mark which option is correct."
    }
  }

  const explanation = q.explanation?.trim() ?? ""
  if (explanation.length < 10) {
    errors.explanation = "Explain why the answer is correct - students see this after answering."
  }

  return errors
}

export function isValid(errors: FieldErrors) {
  return Object.keys(errors).length === 0
}

/** Non-blocking advice, shown alongside the editor. */
export function questionWarnings(q: QuestionDraft): string[] {
  const warnings: string[] = []

  if (!q.reference?.trim()) {
    warnings.push("No reference. Add the CASA/source citation so the question can be defended.")
  }
  if (answerTypeOf(q) === "choice" && (q.options ?? []).length < 4) {
    warnings.push("CASA exams normally present four options.")
  }
  if (answerTypeOf(q) === "numeric") {
    if (!q.answerUnit?.trim() && q.answerValue !== 0) {
      warnings.push("No unit. Students can't tell feet from metres.")
    }
    if (!(q.tolerance ?? 0)) {
      warnings.push("No tolerance: only the exact value will be marked right.")
    }
  }
  if ((q.questionText ?? "").trim().length > 400) {
    warnings.push("This question is long; consider tightening the stem.")
  }

  if (answerTypeOf(q) !== "choice") return warnings

  const lengths = (q.options ?? []).map((o) => o?.trim().length ?? 0)
  const longest = Math.max(...lengths, 0)
  const shortest = Math.min(...(lengths.length ? lengths : [0]))
  if (longest > 0 && longest > shortest * 3 && lengths.length > 1) {
    warnings.push("One option is far longer than the others, which can give the answer away.")
  }

  return warnings
}
