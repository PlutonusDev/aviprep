"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Crosshair,
  History,
  Lightbulb,
  PlayCircle,
  Sparkles,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  EmptyState,
  LoadError,
  PageHeader,
  PageShell,
  PageSkeleton,
  SectionHeading,
} from "@/components/hub/page-primitives"
import {
  ACTIVE_WINDOW_DAYS,
  MIN_SUBJECT_QUESTIONS,
  OUTLIER_GAP,
  PASS_SCORE,
  computeInsights,
  type FocusSubject,
  type WeakTopic,
} from "@lib/insights"
import type { SubjectData, WeakPointData } from "@lib/types"
import { cn } from "@lib/utils"
import { useTenant } from "@lib/tenant-context"

interface LastExam {
  id: string
  completedAt: string
  score: number
  subjectName: string
}

function daysAgo(value: string | Date | null | undefined) {
  if (!value) return null
  const then = new Date(value)
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((start(new Date()) - start(then)) / 86_400_000)
  if (days <= 0) return "today"
  if (days === 1) return "yesterday"
  return `${days} days ago`
}

export default function InsightsContent() {
  const [subjects, setSubjects] = useState<SubjectData[]>([])
  const [weakPoints, setWeakPoints] = useState<WeakPointData[]>([])
  const [lastExam, setLastExam] = useState<LastExam | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const { isFeatureEnabled } = useTenant()

  useEffect(() => {
    let cancelled = false
    Promise.all([fetch("/api/user/subjects"), fetch("/api/user/stats")])
      .then(async ([subjectsRes, statsRes]) => {
        if (!subjectsRes.ok || !statsRes.ok) throw new Error("load")
        const [subjectsData, statsData] = await Promise.all([subjectsRes.json(), statsRes.json()])
        if (cancelled) return
        setSubjects(subjectsData.subjects ?? [])
        setWeakPoints(statsData.weakPoints ?? [])
        const recent: LastExam[] = statsData.recentScores ?? []
        setLastExam(recent[recent.length - 1] ?? null)
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const insights = useMemo(() => computeInsights({ subjects, topics: weakPoints }), [subjects, weakPoints])

  // What they've been doing, even before a subject has enough answers to judge.
  const recentSubject = useMemo(() => {
    const sat = subjects.filter((s) => s.isPurchased && s.examsCompleted > 0 && s.lastAttempt)
    sat.sort((a, b) => new Date(b.lastAttempt!).getTime() - new Date(a.lastAttempt!).getTime())
    const latest = sat[0]
    if (!latest) return null
    const fresh = Date.now() - new Date(latest.lastAttempt!).getTime() <= ACTIVE_WINDOW_DAYS * 86_400_000
    return fresh ? latest : null
  }, [subjects])

  if (loading) return <PageSkeleton tiles={0} />
  if (error) return <LoadError title="We couldn't load your insights" message="Try again in a moment." />

  const sat = subjects.filter((s) => s.isPurchased && s.examsCompleted > 0)
  const { focus, weakTopics, allClear, notEnoughData } = insights

  return (
    <PageShell>
      <PageHeader
        title="Insights"
        description="Where to put your study time next."
      />

      {sat.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No results yet"
          description="Sit a practice exam and we'll show you where to focus."
        >
          <Button asChild className="h-10">
            <Link href="/dashboard/exams">Start a practice exam</Link>
          </Button>
        </EmptyState>
      ) : (
        <>
          {recentSubject && <WorkingOn subject={recentSubject} focus={focus} />}

          {/* The main verdict: one card, and only one of these three states. */}
          {focus ? (
            <FocusCard focus={focus} />
          ) : allClear ? (
            <Card className="border-success/30 bg-success/5 shadow-none">
              <CardContent className="flex items-start gap-4 p-5 sm:p-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/15">
                  <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground">You&apos;re on track</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Every subject is above the {PASS_SCORE}% pass mark. Keep it up.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : notEnoughData ? (
            <Card className="border-dashed shadow-none">
              <CardContent className="flex items-start gap-4 p-5 sm:p-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Lightbulb className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground">Keep practising</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    A few more answers and we&apos;ll be able to spot your weak areas.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {weakTopics.length > 0 && <WeakTopics topics={weakTopics} />}

          <SubjectStanding subjects={sat} average={insights.averageAcrossSubjects} />

          {lastExam && isFeatureEnabled("history") && (
            <Card className="shadow-e1">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <History className="h-5 w-5 text-primary" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-foreground">Review your last exam</h2>
                  <p className="text-sm text-muted-foreground">
                    {lastExam.subjectName} &middot; {lastExam.score}% &middot; {daysAgo(lastExam.completedAt)}
                  </p>
                </div>
                <Button asChild variant="secondary" className="h-10 shrink-0 gap-1.5">
                  <Link href={`/dashboard/history/${lastExam.id}`}>
                    Review answers
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </PageShell>
  )
}

/* --- Pieces ------------------------------------------------------------------ */

function WorkingOn({ subject, focus }: { subject: SubjectData; focus: FocusSubject | null }) {
  // If it's also the focus, the focus card says everything, so keep this to one line.
  const isFocus = focus?.subject.id === subject.id
  return (
    <section aria-label="What you've been working on">
      <Card className="overflow-hidden border-primary/30 shadow-e2">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Working on</p>
            <h2 className="text-xl font-semibold leading-snug text-foreground">{subject.name}</h2>
            <p className="text-sm text-muted-foreground">
              Last exam {daysAgo(subject.lastAttempt)}
              <span aria-hidden="true"> &middot; </span>
              {subject.examsCompleted} {subject.examsCompleted === 1 ? "exam" : "exams"}
              <span aria-hidden="true"> &middot; </span>
              {subject.averageScore}% average
              {!isFocus && subject.questionsAttempted >= MIN_SUBJECT_QUESTIONS && subject.averageScore >= PASS_SCORE && (
                <>
                  <span aria-hidden="true"> &middot; </span>
                  <span className="text-foreground">on track</span>
                </>
              )}
            </p>
          </div>
          <Button asChild size="lg" className="h-11 shrink-0 gap-2">
            <Link href={`/dashboard/exams/${subject.id}`}>
              <PlayCircle className="h-4 w-4" aria-hidden="true" />
              Keep practising
            </Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}

function FocusCard({ focus }: { focus: FocusSubject }) {
  const { subject, reason, gap } = focus
  const underPass = PASS_SCORE - subject.averageScore

  return (
    <section aria-label="Suggested focus">
      <Card className="shadow-e1">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:p-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/10">
            <Crosshair className="h-5 w-5 text-warning" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">
              Focus here
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-foreground">{subject.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {reason === "below-pass" ? (
                <>
                  Averaging <span className="font-medium text-foreground">{subject.averageScore}%</span>, {underPass}{" "}
                  below the pass mark.
                </>
              ) : (
                <>
                  Passing at <span className="font-medium text-foreground">{subject.averageScore}%</span>, but {gap}{" "}
                  points behind your other subjects.
                </>
              )}
            </p>
          </div>
          <Button asChild className="h-10 shrink-0 gap-1.5">
            <Link href={`/dashboard/exams/${subject.id}`}>
              Practise {subject.code || "now"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}

/** Accuracy against the pass mark: a single-hue meter with the mark drawn on. */
function Meter({ value, label }: { value: number; label: string }) {
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-valuetext={`${value}%`}
      className="relative h-1.5 rounded-full bg-muted"
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.max(2, Math.min(100, value))}%`, background: "var(--chart-mark)" }}
      />
      <span
        aria-hidden="true"
        className="absolute -top-1 h-3.5 w-0.5 rounded-full bg-foreground/60"
        style={{ left: `${PASS_SCORE}%` }}
      />
    </div>
  )
}

function WeakTopics({ topics }: { topics: WeakTopic[] }) {
  const shown = topics.slice(0, 8)
  return (
    <section aria-label="Topics to revisit">
      <SectionHeading
        title="Topics to revisit"
        count={String(topics.length)}
      />
      <Card className="overflow-hidden shadow-e1">
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {shown.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
                <div className="min-w-0 flex-1 basis-60">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{t.topic}</p>
                    {t.isActiveSubject && (
                      <Badge variant="outline" className="text-xs font-normal">
                        Current subject
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t.subjectName}
                    <span aria-hidden="true"> &middot; </span>
                    {t.questionsAttempted} answered
                    <span aria-hidden="true"> &middot; </span>
                    {t.reason === "below-pass" ? "below pass" : "behind the rest of the subject"}
                  </p>
                </div>
                <div className="flex w-full items-center gap-3 sm:w-44">
                  <div className="flex-1">
                    <Meter value={t.accuracy} label={`${t.topic} accuracy`} />
                  </div>
                  <span className="w-10 text-right text-sm font-semibold text-foreground" data-tabular>
                    {t.accuracy}%
                  </span>
                </div>
                <Button asChild variant="secondary" size="sm" className="h-9 shrink-0">
                  <Link href={`/dashboard/exams/${t.subjectId}`}>Practise</Link>
                </Button>
              </li>
            ))}
          </ul>
          {topics.length > shown.length && (
            <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
              Top {shown.length} of {topics.length}
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function SubjectStanding({ subjects, average }: { subjects: SubjectData[]; average: number | null }) {
  const sorted = [...subjects].sort((a, b) => a.averageScore - b.averageScore)
  // Same rules as lib/insights, so this list never disagrees with the focus card.
  const judgedCount = subjects.filter((s) => s.questionsAttempted >= MIN_SUBJECT_QUESTIONS).length
  return (
    <section aria-label="Subjects">
      <SectionHeading title="Subjects" />
      <Card className="overflow-hidden shadow-e1">
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {sorted.map((s) => {
              const judged = s.questionsAttempted >= MIN_SUBJECT_QUESTIONS
              const below = judged && s.averageScore < PASS_SCORE
              const trailing =
                judged && !below && judgedCount >= 2 && average !== null && average - s.averageScore >= OUTLIER_GAP
              const onTrack = judged && !below && !trailing
              const status = !judged
                ? "Not enough answers yet"
                : below
                  ? "Below pass"
                  : trailing
                    ? "Behind your other subjects"
                    : "On track"
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="truncate font-medium text-foreground">{s.name}</p>
                    <p
                      className={cn(
                        "mt-0.5 inline-flex items-center gap-1 text-sm",
                        onTrack
                          ? "text-success"
                          : judged
                            ? "text-warning"
                            : "text-muted-foreground",
                      )}
                    >
                      {onTrack ? (
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : judged ? (
                        <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {status}
                    </p>
                  </div>
                  <div className="flex w-full items-center gap-3 sm:w-52">
                    <div className="flex-1">
                      <Meter value={s.averageScore} label={`${s.name} average score`} />
                    </div>
                    <span className="w-10 text-right text-sm font-semibold text-foreground" data-tabular>
                      {s.averageScore}%
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>
    </section>
  )
}
