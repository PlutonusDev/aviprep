"use client"

import { useMemo, useState } from "react"
import { Check, X, Flag } from "lucide-react"
import { cn } from "@lib/utils"
import { QuestionImage } from "./question-image"
import { answerTypeOf, formatTolerance, formatValue, parseNumericAnswer, toleranceBand } from "@lib/exam/marking"

const LETTERS = "ABCDEF"

export type ReviewStatus = "correct" | "incorrect" | "skipped"

export interface ReviewItem {
  key: string
  number: number
  topic: string
  /** Null when the question has been removed from the bank since. */
  questionText: string | null
  imageUrl?: string | null
  imageAlt?: string | null
  /** "choice" | "numeric". Undefined reads as multiple choice. */
  answerType?: string | null
  options: string[]
  correctIndex: number | null | undefined
  /** Typed answers: the value that was wanted, and how far out still counted. */
  answerValue?: number | null
  answerUnit?: string | null
  tolerance?: number | null
  toleranceType?: string | null
  explanation?: string | null
  /**
   * The option chosen. `null` means skipped; `undefined` means it was never
   * recorded - attempts saved before the choice was stored.
   */
  selectedIndex: number | null | undefined
  /** What they typed, for questions answered with a value. */
  answerText?: string | null
  status: ReviewStatus
  flagged: boolean
}

export type ReviewFilter = "all" | "incorrect" | "skipped" | "flagged"

/**
 * Question-by-question review of a finished exam. Shared by the results screen
 * straight after an exam and by exam history, so both read the same way.
 */
export function AnswerReview({
  items,
  initialFilter,
}: {
  items: ReviewItem[]
  initialFilter?: ReviewFilter
}) {
  const counts = useMemo(
    () => ({
      all: items.length,
      incorrect: items.filter((i) => i.status === "incorrect").length,
      skipped: items.filter((i) => i.status === "skipped").length,
      flagged: items.filter((i) => i.flagged).length,
    }),
    [items],
  )

  const [filter, setFilter] = useState<ReviewFilter>(
    initialFilter ?? (counts.incorrect > 0 ? "incorrect" : "all"),
  )

  const visible = items.filter((item) => {
    if (filter === "all") return true
    if (filter === "flagged") return item.flagged
    return item.status === filter
  })

  const filters: { id: ReviewFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "incorrect", label: "Incorrect" },
    { id: "skipped", label: "Skipped" },
    { id: "flagged", label: "Flagged" },
  ]

  return (
    <div>
      <fieldset>
        <legend className="sr-only">Show</legend>
        <div className="flex flex-wrap gap-2">
          {filters
            .filter((f) => f.id === "all" || counts[f.id] > 0)
            .map((f) => {
              const active = filter === f.id
              return (
                <label
                  key={f.id}
                  className={cn(
                    "cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                    active
                      ? "border-primary bg-primary/10 font-medium text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  <input
                    type="radio"
                    name="review-filter"
                    checked={active}
                    onChange={() => setFilter(f.id)}
                    className="sr-only"
                  />
                  {f.label} <span data-tabular>{counts[f.id]}</span>
                </label>
              )
            })}
        </div>
      </fieldset>

      <ol className="mt-6 space-y-4">
        {visible.map((item) => (
          <li key={item.key}>
            <ReviewCard item={item} />
          </li>
        ))}
      </ol>
    </div>
  )
}

/**
 * A marked typed answer: what they wrote, what was wanted, and the band it had
 * to fall in. Someone who missed by a rounding step should be able to see that.
 */
function NumericOutcome({ item }: { item: ReviewItem }) {
  const band = toleranceBand(item)
  const given = parseNumericAnswer(item.answerText)
  const wrong = item.status === "incorrect"

  return (
    <div className="mt-4 space-y-2">
      {item.answerText?.trim() ? (
        <div
          className={cn(
            "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg border p-3 text-sm",
            wrong ? "border-destructive bg-destructive/10" : "border-success bg-success/10",
          )}
        >
          <span className="text-muted-foreground">Your answer</span>
          <span className="font-semibold text-foreground" data-tabular>
            {given === null ? item.answerText : formatValue(given, item.answerUnit)}
          </span>
        </div>
      ) : (
        <p className="rounded-lg border border-border p-3 text-sm text-muted-foreground">You didn&apos;t answer this one.</p>
      )}

      {typeof item.answerValue === "number" && (
        <div
          className={cn(
            "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg border p-3 text-sm",
            wrong || item.status === "skipped" ? "border-success bg-success/10" : "border-border",
          )}
        >
          <span className="text-muted-foreground">
            Correct answer
            {band && band.min !== band.max && (
              <span className="ml-1.5 text-xs" data-tabular>
                ({formatValue(band.min)} to {formatValue(band.max)}, {formatTolerance(item)})
              </span>
            )}
          </span>
          <span className="font-semibold text-foreground" data-tabular>
            {formatValue(item.answerValue, item.answerUnit)}
          </span>
        </div>
      )}
    </div>
  )
}

function ReviewCard({ item }: { item: ReviewItem }) {
  const stemId = `review-${item.key}-stem`
  const recorded = item.selectedIndex !== undefined

  return (
    <article aria-labelledby={stemId} className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Question {item.number}
          {item.topic && (
            <>
              <span aria-hidden="true"> · </span>
              {item.topic}
            </>
          )}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {item.flagged && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Flag className="h-3 w-3 fill-current text-primary" aria-hidden="true" />
              Flagged
            </span>
          )}
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              item.status === "correct" && "bg-success/10 text-success",
              item.status === "incorrect" && "bg-destructive/10 text-destructive",
              item.status === "skipped" && "bg-muted text-muted-foreground",
            )}
          >
            {item.status === "correct" && <Check className="h-3 w-3" aria-hidden="true" />}
            {item.status === "incorrect" && <X className="h-3 w-3" aria-hidden="true" />}
            {item.status === "correct" ? "Correct" : item.status === "incorrect" ? "Incorrect" : "Skipped"}
          </span>
        </div>
      </div>

      {item.questionText === null ? (
        <p id={stemId} className="mt-3 text-sm text-muted-foreground">
          This question has been removed.
        </p>
      ) : (
        <>
          <p id={stemId} className="mt-3 font-medium leading-relaxed text-foreground">
            {item.questionText}
          </p>

          {item.imageUrl && <QuestionImage src={item.imageUrl} alt={item.imageAlt} className="mt-4" />}

          {answerTypeOf(item) === "numeric" ? (
            <NumericOutcome item={item} />
          ) : (
          <ul className="mt-4 space-y-2">
            {item.options.map((option, oi) => {
              const isAnswer = oi === item.correctIndex
              const isTheirs = recorded && oi === item.selectedIndex
              const wrongPick = isTheirs && !isAnswer
              return (
                <li
                  key={oi}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 text-sm",
                    isAnswer && "border-success bg-success/10",
                    wrongPick && "border-destructive bg-destructive/10",
                    !isAnswer && !wrongPick && "border-border",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-semibold",
                      isAnswer && "border-success bg-success text-success-foreground",
                      wrongPick && "border-destructive bg-destructive text-destructive-foreground",
                      !isAnswer && !wrongPick && "border-border text-muted-foreground",
                    )}
                  >
                    {isAnswer ? <Check className="h-3.5 w-3.5" /> : wrongPick ? <X className="h-3.5 w-3.5" /> : LETTERS[oi]}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 leading-relaxed",
                      isAnswer || wrongPick ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {option}
                  </span>
                  {/* Wording, not just colour, says which is which. */}
                  {isAnswer && (
                    <span className="shrink-0 text-xs font-medium text-success">
                      {isTheirs ? "Your answer" : "Correct answer"}
                    </span>
                  )}
                  {wrongPick && <span className="shrink-0 text-xs font-medium text-destructive">Your answer</span>}
                </li>
              )
            })}
          </ul>
          )}

          {item.explanation && (
            <div className="mt-4 rounded-lg bg-muted/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Explanation</p>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground">{item.explanation}</p>
            </div>
          )}
        </>
      )}
    </article>
  )
}
