import { z } from "zod"
import { answerTypeOf } from "@lib/exam/marking"
import { SUBJECTS } from "@lib/subjects"
import rubric from "./data/rubric.json"

/**
 * What AviPrep Intelligence is told and how its answer is tidied up: the model,
 * the schema it must answer in, the two documents it judges against, and the
 * shape of a submission as it reads it.
 *
 * Kept apart from lib/review/ai-reviewer.ts, which does the database work, so
 * the prompt can be built and checked without a server or a connection.
 */

/** Overridable so the reviewer can be pointed at a better model without a deploy. */
export const MODEL = process.env.AI_REVIEW_MODEL || "openai/gpt-4o"

const COMMENT_MAX = 400

export const verdictSchema = z.object({
  writing: z
    .enum(["ok", "needs-work"])
    .describe("needs-work only when the question breaks a stated rule in the handbook or the AviPrep guidelines"),
  mapping: z.enum(["ok", "unsure", "none"]).describe("unsure when the linked MOS item looks like a poor fit; none when nothing is linked"),
  comment: z.string().describe("One or two sentences, addressed to the curator. Name the specific problem, not the rule."),
})

export type Verdict = z.infer<typeof verdictSchema>

/* --- Pure helpers, so the prompt and the tidy-up can be checked -------------- */

/** The model's comment, held to one or two sentences and a sane length. */
export function tidyComment(raw: string): string {
  const text = raw.replace(/\s+/g, " ").trim()
  if (!text) return ""
  // A boundary is terminal punctuation, a space, then a capital. Splitting on
  // the full stop alone eats "1,013.2 hPa" and "e.g.".
  const kept = text.split(/(?<=[.!?])\s+(?=[A-Z])/).slice(0, 2).join(" ")
  return kept.length > COMMENT_MAX ? `${kept.slice(0, COMMENT_MAX - 1).trimEnd()}…` : kept
}

export interface QuestionForReview {
  subjectId: string
  topic: string
  difficulty: string
  questionText: string
  imageUrl?: string | null
  imageAlt?: string | null
  answerType?: string | null
  options: string[]
  correctIndex?: number | null
  answerValue?: number | null
  answerUnit?: string | null
  tolerance?: number | null
  toleranceType?: string | null
  explanation: string
  reference: string
}

export interface MosForReview {
  ref: string
  primary: boolean
  text: string
}

/** Everything the model is shown about the submission, in the order it reads it. */
export function buildPrompt(question: QuestionForReview, mos: MosForReview[]): string {
  const subject = SUBJECTS.find((s) => s.id === question.subjectId)
  const lines: string[] = [
    `Subject: ${subject ? `${subject.name} (${subject.code})` : question.subjectId}`,
    `Topic: ${question.topic}`,
    `Difficulty the curator chose: ${question.difficulty}`,
    "",
    `Stem: ${question.questionText}`,
  ]

  if (question.imageUrl) {
    lines.push(`Image: the question is asked about a figure. Its description for screen readers is ${question.imageAlt ? `"${question.imageAlt}"` : "missing"}.`)
  }

  if (answerTypeOf(question) === "numeric") {
    const within =
      question.toleranceType === "absolute"
        ? `${question.tolerance ?? 0} ${question.answerUnit ?? ""}`.trim()
        : `${question.tolerance ?? 0}%`
    lines.push("", `Answer: a typed value of ${question.answerValue}${question.answerUnit ? ` ${question.answerUnit}` : ""}, accepted within ${within}.`)
  } else {
    lines.push("", "Options, in the order the curator wrote them (students see them shuffled):")
    question.options.forEach((option, i) => {
      lines.push(`  ${i + 1}. ${option}${i === question.correctIndex ? "   <- keyed as correct" : ""}`)
    })
  }

  lines.push("", `Explanation: ${question.explanation}`, `Reference: ${question.reference || "none given"}`)

  lines.push("", "Part 61 MOS Schedule 3 items the curator linked:")
  if (!mos.length) lines.push("  none")
  for (const link of mos) lines.push(`  ${link.ref}${link.primary ? " (primary)" : ""}: ${link.text}`)

  return lines.join("\n")
}

export const SYSTEM = `You are AviPrep Intelligence. You read each exam question an AviPrep curator submits and leave one short comment on the review thread before a human reviewer sees it.

You do not approve or reject anything, and you never say a question is approved, rejected or ready to publish. An admin decides that.

Judge the question against the two documents below. They are the only standards that apply.

Set writing to "needs-work" only when the question breaks a rule one of those documents actually states: a stem that carries more than one idea, a giveaway (the longest option keyed correct, a grammatical mismatch with the stem, an absolute or a determiner), a double negative or an unemphasised negative, an option that references another option by letter, a distractor that is not plausible, a refutable key, irrelevant material in the stem, or an explanation that does not support the key. If the writing is sound, set it to "ok" even when you can imagine a better question. Curators are experienced; do not invent problems.

Judge the MOS mapping separately. Set mapping to "unsure" when the primary item looks like a poor fit for what the question actually tests - most often when the item's verb (calculate, explain, describe) does not match what the student has to do. Doubt about the mapping never makes writing "needs-work".

The comment is one or two sentences addressed to the curator, plain and specific. Name the problem in the question, not the rule it breaks. When writing is "needs-work", say what to change. When mapping is "unsure", add a short clause raising it as a question, not an instruction. When both are fine, say so in one sentence and do not pad it.

--- ${rubric.handbook.title} ---
${rubric.handbook.text}

--- ${rubric.guidelines.title} ---
${rubric.guidelines.text}`
