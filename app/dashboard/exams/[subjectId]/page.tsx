"use client"

import { useState, useEffect, useRef, useCallback, useMemo, use } from "react"
import { useRouter } from "next/navigation"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  X,
  XCircle,
  RotateCcw,
  Flag,
  LayoutGrid,
  AlertTriangle,
  ListChecks,
} from "lucide-react"
import Link from "@/components/meta/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import confetti from "canvas-confetti"
import type { QuestionData } from "@lib/types"
import { ContributorNames } from "@/components/attribution/contributors"
import { useTenant } from "@lib/tenant-context"
import { cn } from "@lib/utils"
import { AnswerReview, type ReviewItem } from "@/components/exam/answer-review"
import { QuestionImage } from "@/components/exam/question-image"
import { NumericAnswer } from "@/components/exam/numeric-answer"
import {
  answerTypeOf,
  isAnswerCorrect,
  isAnswered,
  parseNumericAnswer,
  type StudentAnswer,
} from "@lib/exam/marking"

interface ExamPageProps {
  params: Promise<{ subjectId: string }>
}

interface Subject {
  id: string
  name: string
  code: string
}

interface ExamResult {
  correct: number
  total: number
  percentage: number
  unanswered: number
  flagged: number
  timeSpentMins: number
  passed: boolean
}

/** The server's pass mark. A fallback only - the API sends the real one. */
const DEFAULT_PASS_SCORE = 70

const LETTERS = "ABCDEF"

export default function ExamPage({ params }: ExamPageProps) {
  const { subjectId } = use(params)
  const router = useRouter()
  const { isWhitelabeled, isFeatureEnabled } = useTenant()

  const [subject, setSubject] = useState<Subject | null>(null)
  const [passScore, setPassScore] = useState(DEFAULT_PASS_SCORE)
  const [questions, setQuestions] = useState<QuestionData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [current, setCurrent] = useState(0)
  // An option index for multiple choice, or what they typed for a value.
  const [answers, setAnswers] = useState<StudentAnswer[]>([])
  const [flagged, setFlagged] = useState<Set<number>>(new Set())
  const [mapOpen, setMapOpen] = useState(false)
  const [exitOpen, setExitOpen] = useState(false)
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false)

  const [result, setResult] = useState<ExamResult | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [saveError, setSaveError] = useState(false)

  // Refs, not state: timing must not trigger renders, and must survive them.
  const startedAtRef = useRef(Date.now())
  const enteredAtRef = useRef(Date.now())
  const timesRef = useRef<number[]>([])
  const payloadRef = useRef<unknown>(null)
  const stemRef = useRef<HTMLParagraphElement>(null)
  const firstRender = useRef(true)
  const savingRef = useRef<Promise<void> | null>(null)
  // Bumped by "Try again" to draw a fresh set of questions.
  const [round, setRound] = useState(0)

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const response = await fetch(`/api/user/questions/${subjectId}`)
        if (response.status === 403) {
          setError(
            isWhitelabeled
              ? "Your school hasn't assigned this subject to you."
              : "You don't have access to this subject yet.",
          )
          return
        }
        if (!response.ok) throw new Error("We couldn't load this exam. Try again in a moment.")
        const data = await response.json()
        setSubject(data.subject)
        // The pass mark comes back at the top level of the response. Reading it
        // off `subject` gave undefined, which failed every exam on this page.
        setPassScore(typeof data.passScore === "number" ? data.passScore : DEFAULT_PASS_SCORE)
        setQuestions(data.questions)
        setAnswers(Array(data.questions.length).fill(null))
        setCurrent(0)
        startedAtRef.current = Date.now()
        enteredAtRef.current = Date.now()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      } finally {
        setLoading(false)
      }
    }
    fetchQuestions()
  }, [subjectId, isWhitelabeled, round])

  const question = questions[current]
  const selected = answers[current] ?? null
  const isLast = current === questions.length - 1
  const answeredCount = answers.filter(isAnswered).length
  const unansweredCount = answers.length - answeredCount

  /** Add the time spent on `index` since it was entered. */
  const bankTime = useCallback((index: number) => {
    const now = Date.now()
    timesRef.current[index] = (timesRef.current[index] ?? 0) + (now - enteredAtRef.current)
    enteredAtRef.current = now
  }, [])

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= questions.length) return
      setMapOpen(false)
      if (index === current) return
      // Banked here, outside any state setter: StrictMode runs setters twice.
      bankTime(current)
      setCurrent(index)
    },
    [current, questions.length, bankTime],
  )

  // A new question: back to the top, and focus the stem so a screen reader reads it.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.scrollTo({ top: 0 })
    stemRef.current?.focus({ preventScroll: true })
  }, [current])

  const record = useCallback(
    (answer: StudentAnswer) => {
      setAnswers((prev) => {
        const next = [...prev]
        next[current] = answer
        return next
      })
    },
    [current],
  )

  const choose = useCallback(
    (index: number) => {
      if (!question || index < 0 || index >= question.options.length) return
      record(index)
    },
    [question, record],
  )

  const toggleFlag = useCallback(() => {
    setFlagged((prev) => {
      const next = new Set(prev)
      if (next.has(current)) next.delete(current)
      else next.add(current)
      return next
    })
  }, [current])

  const save = useCallback(() => {
    setSubmitting(true)
    setSaveError(false)
    const run = (async () => {
      try {
        const res = await fetch("/api/exam/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadRef.current),
        })
        if (!res.ok) throw new Error(`Save failed with status ${res.status}`)
      } catch (err) {
        console.error("Failed to save exam results:", err)
        setSaveError(true)
      } finally {
        setSubmitting(false)
      }
    })()
    // Kept so "Try again" can wait for it: the next draw depends on this result.
    savingRef.current = run
    return run
  }, [])

  const finish = useCallback(() => {
    setConfirmFinishOpen(false)
    setMapOpen(false)
    bankTime(current)

    const correct = answers.reduce<number>((n, a, i) => (isAnswerCorrect(questions[i], a) ? n + 1 : n), 0)
    const total = questions.length
    const unanswered = answers.filter((a) => !isAnswered(a)).length
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0
    // A completed sitting always took some time; never record 0 minutes.
    const timeSpentMins = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 60000))

    setResult({
      correct,
      total,
      percentage,
      unanswered,
      flagged: flagged.size,
      timeSpentMins,
      passed: percentage >= passScore,
    })

    // Built once, so a retry resends exactly what failed rather than recomputing.
    payloadRef.current = {
      subjectId,
      score: percentage,
      totalQuestions: total,
      correctAnswers: correct,
      timeSpentMins,
      questionResults: questions.map((q, i) => {
        const answer = answers[i] ?? null
        const typed = answerTypeOf(q) === "numeric"
        return {
          questionId: q.id,
          topic: q.topic,
          correct: isAnswerCorrect(q, answer),
          // The option chosen, as its index in the question bank - answers are
          // shuffled on screen, so the shown index would point at the wrong option later.
          selectedIndex:
            typed || typeof answer !== "number" ? null : (q.optionOrder?.[answer] ?? answer),
          /** What they typed, for questions answered with a value. */
          answerText: typed && typeof answer === "string" ? answer : null,
          flagged: flagged.has(i),
          timeTaken: Math.round((timesRef.current[i] ?? 0) / 1000),
        }
      }),
    }

    window.scrollTo({ top: 0 })
    save()
  }, [answers, questions, flagged, passScore, subjectId, current, bankTime, save])

  // Submitting always asks first: answers are not marked until the end, so an
  // accidental submit would throw away the chance to change any of them.
  const requestFinish = useCallback(() => {
    setMapOpen(false)
    setConfirmFinishOpen(true)
  }, [])

  const next = useCallback(() => {
    if (isLast) requestFinish()
    else goTo(current + 1)
  }, [isLast, requestFinish, goTo, current])

  const restart = async () => {
    // Wait for the last result to save, then draw a new set: it decides which
    // questions are still unseen or were last answered wrong.
    setLoading(true)
    await savingRef.current?.catch(() => {})
    setError(null)
    setRound((r) => r + 1)
    setCurrent(0)
    setAnswers([])
    setFlagged(new Set())
    setResult(null)
    setReviewing(false)
    setSaveError(false)
    timesRef.current = []
    payloadRef.current = null
    // Previously never reset, so a retry's time included the attempt before it.
    startedAtRef.current = Date.now()
    enteredAtRef.current = Date.now()
    window.scrollTo({ top: 0 })
  }

  // Celebrate a pass once, from an effect, and never when motion is reduced.
  useEffect(() => {
    if (!result?.passed) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.9 }, colors: ["#F78601", "#22c55e", "#0ea5e9"] })
  }, [result])

  // Keyboard while sitting: 1-6 or A-E choose, Enter moves on, F flags.
  useEffect(() => {
    if (result || !question) return

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (exitOpen || confirmFinishOpen) return
      const target = e.target as HTMLElement | null
      // Leave real controls alone, except the radio options themselves.
      if (target?.closest('input, textarea, a, [role="dialog"], button:not([role="radio"])')) return

      const key = e.key.toLowerCase()

      // A typed answer owns the keyboard: every digit belongs in the box.
      if (answerTypeOf(question) === "numeric") {
        if (key === "enter") {
          e.preventDefault()
          next()
        }
        return
      }

      const numeric = Number.parseInt(key, 10)
      const letterIndex = LETTERS.toLowerCase().indexOf(key)

      if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= question.options.length) {
        e.preventDefault()
        choose(numeric - 1)
      } else if (key === "f") {
        // F is always flag, so letter selection stops at E.
        e.preventDefault()
        toggleFlag()
      } else if (key.length === 1 && letterIndex >= 0 && letterIndex < question.options.length) {
        e.preventDefault()
        choose(letterIndex)
      } else if (key === "enter") {
        e.preventDefault()
        next()
      }
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [result, question, exitOpen, confirmFinishOpen, choose, toggleFlag, next])

  const progress = useMemo(
    () => (questions.length ? ((current + 1) / questions.length) * 100 : 0),
    [current, questions.length],
  )

  const reviewItems = useMemo<ReviewItem[]>(
    () =>
      questions.map((q, i) => {
        const answer = answers[i] ?? null
        const typed = answerTypeOf(q) === "numeric"
        return {
          key: q.id,
          number: i + 1,
          topic: q.topic,
          questionText: q.questionText,
          imageUrl: q.imageUrl,
          imageAlt: q.imageAlt,
          answerType: q.answerType,
          options: q.options,
          correctIndex: q.correctIndex,
          answerValue: q.answerValue,
          answerUnit: q.answerUnit,
          tolerance: q.tolerance,
          toleranceType: q.toleranceType,
          explanation: q.explanation,
          selectedIndex: typed || typeof answer !== "number" ? null : answer,
          answerText: typed && typeof answer === "string" ? answer : null,
          status: !isAnswered(answer) ? "skipped" : isAnswerCorrect(q, answer) ? "correct" : "incorrect",
          flagged: flagged.has(i),
        }
      }),
    [questions, answers, flagged],
  )

  // --- Loading -------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col">
        <div className="h-14 border-b border-border" />
        <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-12">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-16 w-full" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  // --- Error ---------------------------------------------------------------
  if (error || !subject || questions.length === 0) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <h1 className="font-semibold text-foreground">
            {error ? "This exam isn't available" : "No questions yet"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error || "No questions for this subject yet."}
          </p>
          <Button asChild variant="outline" className="mt-6 h-10">
            <Link href="/dashboard/exams">Back to exams</Link>
          </Button>
        </div>
      </div>
    )
  }

  // --- Review --------------------------------------------------------------
  if (result && reviewing) {
    return (
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setReviewing(false)
                window.scrollTo({ top: 0 })
              }}
              className="h-9 gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Results
            </Button>
            <p className="min-w-0 flex-1 truncate text-right text-sm text-muted-foreground" data-tabular>
              {result.percentage}% · {result.correct} of {result.total} correct
            </p>
          </div>
        </header>

        <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
          <h1 className="text-display-3 font-bold text-foreground">Review your answers</h1>

          <div className="mt-5">
            <AnswerReview items={reviewItems} />
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={restart} size="lg" className="h-11 gap-2">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
            <Button asChild variant="outline" size="lg" className="h-11">
              <Link href="/dashboard/exams">Back to exams</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // --- Results -------------------------------------------------------------
  if (result) {
    const incorrect = result.total - result.correct - result.unanswered

    return (
      <div className="flex min-h-dvh flex-col">
        <header className="border-b border-border">
          <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
            <Button asChild variant="ghost" size="icon" className="h-9 w-9">
              <Link href="/dashboard/exams" aria-label="Back to exams">
                <X className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <p className="truncate text-sm font-medium text-foreground">{subject.name}</p>
          </div>
        </header>

        <div className="mx-auto w-full max-w-xl flex-1 px-4 py-12 text-center">
          {saveError && (
            <div
              role="alert"
              className="mb-8 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-left"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">This result wasn&apos;t saved</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Check your connection and try again.
                </p>
                <Button size="sm" variant="outline" onClick={save} disabled={submitting} className="mt-3 h-9">
                  {submitting ? "Saving..." : "Try saving again"}
                </Button>
              </div>
            </div>
          )}

          <h1 className="sr-only">Exam results</h1>

          <span
            className={cn(
              "mx-auto flex h-14 w-14 items-center justify-center rounded-full",
              result.passed ? "bg-success/10" : "bg-destructive/10",
            )}
          >
            {result.passed ? (
              <CheckCircle2 className="h-7 w-7 text-success" aria-hidden="true" />
            ) : (
              <XCircle className="h-7 w-7 text-destructive" aria-hidden="true" />
            )}
          </span>

          <p className={cn("mt-5 text-sm font-semibold", result.passed ? "text-success" : "text-destructive")}>
            {result.passed ? "Passed" : "Not passed"}
            <span className="font-normal text-muted-foreground"> · pass mark {passScore}%</span>
          </p>

          {/* The one number this screen is about. */}
          <p className="mt-2 font-sans text-6xl font-semibold tracking-tight text-foreground">
            {result.percentage}%
          </p>
          <p className="mt-2 text-muted-foreground">
            {result.correct} of {result.total} correct
          </p>

          <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
            {[
              { label: "Correct", value: result.correct },
              { label: "Incorrect", value: incorrect },
              { label: "Skipped", value: result.unanswered },
              { label: "Time", value: `${result.timeSpentMins} min` },
            ].map((stat) => (
              <div key={stat.label} className="bg-card px-3 py-4">
                <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                <dd className="mt-1 font-semibold text-foreground" data-tabular>
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {/* Reviewing is where the learning happens, so it leads. */}
            <Button
              onClick={() => {
                setReviewing(true)
                window.scrollTo({ top: 0 })
              }}
              size="lg"
              className="h-11 gap-2"
            >
              <ListChecks className="h-4 w-4" aria-hidden="true" />
              Review answers
            </Button>
            <Button onClick={restart} variant="outline" size="lg" className="h-11 gap-2">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
          </div>

          <div className="mt-4 flex justify-center gap-6 text-sm">
            <Link href="/dashboard/exams" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              Back to exams
            </Link>
            {isFeatureEnabled("history") && (
              <Link href="/dashboard/history" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                View history
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  // --- Sitting -------------------------------------------------------------
  const stemId = `question-${current}-stem`

  return (
    <div className="flex min-h-dvh flex-col">
      <h1 className="sr-only">{subject.name} practice exam</h1>

      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExitOpen(true)}
            aria-label="Leave exam"
            className="h-9 w-9 shrink-0"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>

          <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{subject.name}</p>

          <p className="shrink-0 text-sm text-muted-foreground" data-tabular aria-hidden="true">
            {current + 1} / {questions.length}
          </p>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMapOpen((v) => !v)}
            aria-expanded={mapOpen}
            aria-controls="question-map"
            className="h-9 shrink-0 gap-1.5"
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">All questions</span>
          </Button>
        </div>

        <div className="h-0.5 bg-muted" aria-hidden="true">
          <div
            className="h-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Out of the way until asked for: a wall of numbered buttons is the
            first thing that competes with the question. */}
        <div id="question-map" hidden={!mapOpen} className="border-t border-border bg-background">
          <div className="mx-auto max-w-2xl px-4 py-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground" data-tabular>
                {answeredCount} of {questions.length} answered
                {flagged.size > 0 && ` · ${flagged.size} flagged`}
              </p>
              <Button variant="outline" size="sm" className="h-8" onClick={requestFinish}>
                Finish exam
              </Button>
            </div>

            {/* Answered / not answered / flagged only - nothing here hints at
                whether an answer is right until the exam is finished. */}
            <ol className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
              {questions.map((q, i) => {
                const answered = answers[i] !== null
                const isFlagged = flagged.has(i)
                const here = i === current

                return (
                  <li key={q.id}>
                    <button
                      type="button"
                      onClick={() => goTo(i)}
                      aria-current={here ? "step" : undefined}
                      aria-label={`Question ${i + 1}, ${answered ? "answered" : "not answered"}${isFlagged ? ", flagged" : ""}`}
                      className={cn(
                        "relative flex h-9 w-full items-center justify-center rounded-md border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        here && "border-primary bg-primary text-primary-foreground",
                        !here && answered && "border-primary/40 bg-primary/10 text-foreground",
                        !here && !answered && "border-border text-muted-foreground hover:bg-muted",
                      )}
                    >
                      <span data-tabular>{i + 1}</span>
                      {isFlagged && (
                        <span
                          aria-hidden="true"
                          className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-border bg-background"
                        >
                          <Flag className="h-2.5 w-2.5 fill-current text-primary" />
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-8 sm:pt-12">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {question.topic}
            <span aria-hidden="true"> · </span>
            <span className="capitalize">{question.difficulty}</span>
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFlag}
            aria-pressed={flagged.has(current)}
            className={cn("h-8 gap-1.5", flagged.has(current) ? "text-primary" : "text-muted-foreground")}
          >
            <Flag className={cn("h-3.5 w-3.5", flagged.has(current) && "fill-current")} aria-hidden="true" />
            {flagged.has(current) ? "Flagged" : "Flag"}
          </Button>
        </div>

        <p
          id={stemId}
          ref={stemRef}
          tabIndex={-1}
          className="text-lg font-medium leading-relaxed text-foreground outline-none sm:text-xl"
        >
          <span className="sr-only">
            Question {current + 1} of {questions.length}.{" "}
          </span>
          {question.questionText}
        </p>

        {question.imageUrl && (
          <QuestionImage src={question.imageUrl} alt={question.imageAlt} className="mt-5" />
        )}

        {answerTypeOf(question) === "numeric" ? (
          <NumericAnswer
            className="mt-8"
            value={typeof selected === "string" ? selected : ""}
            onChange={record}
            unit={question.answerUnit}
            labelledBy={stemId}
          />
        ) : (
        <RadioGroupPrimitive.Root
          value={typeof selected === "number" ? String(selected) : ""}
          onValueChange={(v) => choose(Number.parseInt(v, 10))}
          aria-labelledby={stemId}
          className="mt-8 space-y-3"
        >
          {question.options.map((option, i) => {
            const isSelected = selected === i
            return (
              <label
                key={i}
                htmlFor={`option-${current}-${i}`}
                className={cn(
                  "relative flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                {/* Visually hidden but focusable; the row shows its focus. The scroll
                    margins keep a focused option clear of the fixed header and footer. */}
                <RadioGroupPrimitive.Item
                  value={String(i)}
                  id={`option-${current}-${i}`}
                  className="sr-only scroll-mb-28 scroll-mt-20"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-semibold transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {LETTERS[i]}
                </span>
                <span className="min-w-0 flex-1 pt-0.5 leading-relaxed text-foreground">{option}</span>
              </label>
            )
          })}
        </RadioGroupPrimitive.Root>
        )}

        <ContributorNames contributors={question.contributors ?? []} className="mt-4 text-right" />

        <p className="mt-8 hidden text-center text-xs text-muted-foreground sm:block">
          {answerTypeOf(question) === "numeric"
            ? "Enter for next"
            : `1–${question.options.length} to answer · Enter for next · F to flag`}
        </p>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
          <Button variant="ghost" onClick={() => goTo(current - 1)} disabled={current === 0} className="h-11 gap-1.5">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          <p className="ml-auto hidden text-sm text-muted-foreground sm:block" data-tabular>
            {answeredCount} of {questions.length} answered
          </p>

          <Button onClick={next} disabled={submitting} className="ml-auto h-11 min-w-36 gap-1.5 sm:ml-4">
            {isLast ? "Finish exam" : isAnswered(selected) ? "Next question" : "Skip"}
            {!isLast && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </div>
      </footer>

      <AlertDialog open={exitOpen} onOpenChange={setExitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this exam?</AlertDialogTitle>
            <AlertDialogDescription>Your answers so far won&apos;t be saved.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep going</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push("/dashboard/exams")}>Leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmFinishOpen} onOpenChange={setConfirmFinishOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit your exam?</AlertDialogTitle>
            <AlertDialogDescription>
              {unansweredCount > 0
                ? `${unansweredCount} unanswered. They'll be marked wrong.`
                : "All questions answered. You can't change them after this."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep going</AlertDialogCancel>
            <AlertDialogAction onClick={finish}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
