"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Clock, History, Info, RotateCcw, Target, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AnswerReview, type ReviewItem } from "@/components/exam/answer-review"
import { EmptyState, PageShell, StatTile, formatMinutes } from "@/components/hub/page-primitives"

interface AttemptPayload {
  attempt: {
    id: string
    subjectId: string
    subjectName: string
    score: number
    totalQuestions: number
    correctAnswers: number
    timeSpent: number
    passed: boolean
    completedAt: string
  }
  items: ReviewItem[]
  answersRecorded: boolean
}

export default function AttemptReviewPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = use(params)
  const [data, setData] = useState<AttemptPayload | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading")

  useEffect(() => {
    let cancelled = false
    fetch(`/api/user/history/${attemptId}`)
      .then(async (res) => {
        if (cancelled) return
        if (res.status === 404) return setStatus("missing")
        if (!res.ok) throw new Error(String(res.status))
        setData(await res.json())
        setStatus("ready")
      })
      .catch(() => !cancelled && setStatus("error"))
    return () => {
      cancelled = true
    }
  }, [attemptId])

  const back = (
    <Button asChild variant="ghost" size="sm" className="-ml-2 h-9 gap-1.5 text-muted-foreground">
      <Link href="/dashboard/history">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Exam history
      </Link>
    </Button>
  )

  if (status === "loading") {
    return (
      <PageShell>
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-72" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </PageShell>
    )
  }

  if (status !== "ready" || !data) {
    return (
      <PageShell>
        {back}
        <div role="alert">
          <EmptyState
            icon={History}
            title={status === "missing" ? "Exam not found" : "We couldn't load this exam"}
            description={
              status === "missing"
                ? "It may have been removed."
                : "Try again in a moment."
            }
          />
        </div>
      </PageShell>
    )
  }

  const { attempt, items, answersRecorded } = data
  const skipped = items.filter((i) => i.status === "skipped").length
  const completed = new Date(attempt.completedAt).toLocaleString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })

  return (
    <PageShell>
      <header className="space-y-3">
        {back}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-display-3 font-bold text-foreground">{attempt.subjectName}</h1>
            <p className="text-muted-foreground">{completed}</p>
          </div>
          <Button asChild size="lg" className="h-11 shrink-0 gap-2">
            <Link href={`/dashboard/exams/${attempt.subjectId}`}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Sit again
            </Link>
          </Button>
        </div>
      </header>

      <section aria-label="Result" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Target} label="Score" value={`${attempt.score}%`} />
        <StatTile
          icon={attempt.passed ? CheckCircle2 : XCircle}
          label="Result"
          value={attempt.passed ? "Passed" : "Not passed"}
        />
        <StatTile
          icon={CheckCircle2}
          label="Correct"
          value={`${attempt.correctAnswers} of ${attempt.totalQuestions}`}
          detail={answersRecorded && skipped > 0 ? `${skipped} skipped` : undefined}
        />
        <StatTile icon={Clock} label="Time" value={formatMinutes(attempt.timeSpent)} />
      </section>

      <section aria-labelledby="review-heading">
        <h2 id="review-heading" className="mb-3 text-base font-semibold text-foreground">
          Your answers
        </h2>

        {!answersRecorded && items.length > 0 && (
          <p className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Your picks weren&apos;t saved for this exam, so only the correct answers are shown.
          </p>
        )}

        {items.length === 0 ? (
          <EmptyState
            icon={History}
            title="No answers saved"
            description="Only the score was saved for this exam."
          />
        ) : (
          <div className="max-w-3xl">
            <AnswerReview items={items} />
          </div>
        )}
      </section>
    </PageShell>
  )
}
