"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BookOpen,
  Target,
  Flame,
  Clock,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Plane,
  Cloud,
  Compass,
  Scale,
  Brain,
  Gauge,
  ClipboardList,
  Lock,
  GraduationCap,
  ChevronRight,
  Sparkles,
  CircleDot,
  PlayCircle,
  Shuffle,
  Timer,
  Crosshair,
} from "lucide-react"
import Link from "next/link"
import { useUser } from "@lib/user-context"
import { SUBJECTS as allSubjects } from "@lib/subjects"
import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useTenant } from "@lib/tenant-context"
import { QuickActions, type QuickAction } from "@/components/hub/quick-actions"
import { StatTile, SectionHeading } from "@/components/hub/page-primitives"

const QUICK_ACTIONS: QuickAction[] = [
  { href: "/dashboard/exams", icon: ClipboardList, title: "Practice exam", hint: "Pick a subject" },
  { href: "/dashboard/exams/mixed", icon: Shuffle, title: "Mixed exam", hint: "Across every subject" },
  { href: "/dashboard/exams/timed", icon: Timer, title: "Timed exam", hint: "Real exam conditions" },
]

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Plane,
  Cloud,
  Compass,
  Scale,
  Brain,
  Gauge,
  ClipboardList,
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4 lg:p-8">
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-lg" />
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  )
}

interface ContinuePayload {
  course: {
    courseId: string
    title: string
    subjectName: string | null
    thumbnail?: string | null
    totalLessons: number
    completedLessons: number
    progress: number
    nextLesson: { id: string; title: string } | null
  } | null
  lastExam: {
    subjectId: string
    subjectName: string
    score: number
    passed: boolean
    completedAt: string
  } | null
  weakPoint: {
    topic: string
    subjectId: string
    subjectName: string
    accuracy: number
  } | null
}

export default function DashboardContent() {
  const [resume, setResume] = useState<ContinuePayload | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/user/continue")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("continue"))))
      .then((d) => {
        if (!cancelled) setResume(d)
      })
      .catch(() => {
        if (!cancelled) setResume({ course: null, lastExam: null, weakPoint: null })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const { user, examAttempts, stats, isLoading, hasAccessToSubject } = useUser()
  const { tenant, isWhitelabeled, isFeatureEnabled } = useTenant()

  const subjectStats = useMemo(() => {
    const statsMap: Record<string, { totalQuestions: number; correctAnswers: number; examsTaken: number }> = {}

    for (const exam of examAttempts) {
      if (!statsMap[exam.subjectId]) {
        statsMap[exam.subjectId] = { totalQuestions: 0, correctAnswers: 0, examsTaken: 0 }
      }
      statsMap[exam.subjectId].totalQuestions += exam.totalQuestions
      statsMap[exam.subjectId].correctAnswers += exam.correctAnswers
      statsMap[exam.subjectId].examsTaken += 1
    }

    return statsMap
  }, [examAttempts])

  // Previously rebuilt on every render, which also made subjectStats' memo moot.
  const { purchasedSubjects, lockedSubjects } = useMemo(() => {
    const theorySubjects = allSubjects.map((subject) => {
      const s = subjectStats[subject.id]
      const attempted = s?.totalQuestions ?? 0

      return {
        ...subject,
        isPurchased: hasAccessToSubject(subject.id),
        questionsAttempted: attempted,
        correctAnswers: s?.correctAnswers ?? 0,
        examsTaken: s?.examsTaken ?? 0,
        accuracy: attempted > 0 ? Math.round(((s?.correctAnswers ?? 0) / attempted) * 100) : 0,
        progress: attempted > 0 ? Math.min(100, Math.round((attempted / subject.totalQuestions) * 100)) : 0,
      }
    })

    return {
      purchasedSubjects: theorySubjects.filter((s) => s.isPurchased),
      lockedSubjects: theorySubjects.filter((s) => !s.isPurchased),
    }
  }, [subjectStats, hasAccessToSubject])

  const recentExams = useMemo(
    () =>
      examAttempts.slice(0, 3).map((exam) => ({
        id: exam.id,
        subjectName: exam.subjectName,
        date: new Date(exam.completedAt).toLocaleDateString(),
        score: exam.score,
        totalQuestions: exam.totalQuestions,
        correctAnswers: exam.correctAnswers,
        passed: exam.passed,
      })),
    [examAttempts],
  )

  if (isLoading) return <DashboardSkeleton />

  const displayStats = stats || {
    totalExamsTaken: 0,
    averageScore: 0,
    studyStreak: 0,
    totalStudyHours: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
  }

  const hasSubjects = purchasedSubjects.length > 0

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4 lg:p-8">
      {/* Greeting */}
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-display-3 font-bold text-foreground">
              Welcome back, {user?.firstName || "Pilot"}
            </h1>
            {tenant && (
              <Badge variant="outline">
                {tenant.name} {user?.isFlightSchoolAdmin ? "Admin" : "Student"}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {hasSubjects
              ? "Pick up where you left off."
              : "Get started by choosing your first subject."}
          </p>
          {/*tenant?.welcomeMessage && (
            <p className="text-sm text-muted-foreground">{tenant.welcomeMessage}</p>
          )*/}
        </div>

        {/* A school student gets access through their school, so never point
            them at AviPrep's own checkout. */}
        {(hasSubjects || !isWhitelabeled) && (
          <Button asChild size="lg" className="h-11 shrink-0 gap-2">
            <Link href={hasSubjects ? "/dashboard/exams" : "/dashboard/pricing"}>
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              {hasSubjects ? "Start practising" : "Get access"}
            </Link>
          </Button>
        )}
      </header>

      {/* Headline numbers */}
      <section aria-label="Your progress at a glance">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile icon={Flame} label="Day streak" value={String(displayStats.studyStreak)} />
          <StatTile icon={Target} label="Average score" value={`${displayStats.averageScore}%`} />
          <StatTile icon={BookOpen} label="Exams taken" value={String(displayStats.totalExamsTaken)} />
          <StatTile icon={Clock} label="Hours studied" value={`${displayStats.totalStudyHours}h`} />
          <StatTile
            icon={CheckCircle2}
            label="Accuracy"
            value={
              displayStats.questionsAnswered > 0
                ? `${Math.round((displayStats.correctAnswers / displayStats.questionsAnswered) * 100)}%`
                : "--"
            }
          />
        </div>
      </section>

      {/* Resume - the most useful thing on the page, so it leads. */}
      {hasSubjects && isFeatureEnabled("learn") && (
        <section aria-label="Pick up where you left off" data-tour="dashboard-resume">
          {resume === null ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : resume.course ? (
            <Card className="overflow-hidden border-primary/30 shadow-e2">
              <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Pick up where you left off
                  </p>
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold leading-snug text-foreground">
                      {resume.course.nextLesson?.title ?? resume.course.title}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {resume.course.title}
                      {resume.course.subjectName ? " · " + resume.course.subjectName : ""}
                    </p>
                  </div>

                  <div className="max-w-sm space-y-1.5">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-muted-foreground">Lessons complete</span>
                      <span className="font-medium text-foreground" data-tabular>
                        {resume.course.completedLessons} of {resume.course.totalLessons}
                      </span>
                    </div>
                    <Progress value={resume.course.progress} className="h-1.5" />
                  </div>
                </div>

                <Button asChild size="lg" className="h-12 shrink-0 gap-2 px-6">
                  <Link
                    href={
                      resume.course.nextLesson
                        ? "/dashboard/learn/" +
                          resume.course.courseId +
                          "/lesson/" +
                          resume.course.nextLesson.id
                        : "/dashboard/learn/" + resume.course.courseId
                    }
                  >
                    <PlayCircle className="h-5 w-5" aria-hidden="true" />
                    {resume.course.completedLessons > 0 ? "Resume lesson" : "Start course"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed shadow-none">
              <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-foreground">Nothing in progress</h2>
                  <p className="text-sm text-muted-foreground">
                    Start a course or jump into a practice exam.
                  </p>
                </div>
                <Button asChild className="h-11 shrink-0">
                  <Link href="/dashboard/learn">Browse courses</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* Jump straight into a session. */}
      {hasSubjects && <QuickActions actions={QUICK_ACTIONS} />}

      {/* What to work on next, and how the last sitting went. */}
      {(resume?.weakPoint || resume?.lastExam) && (
        <section aria-label="Where to focus" className="grid gap-4 md:grid-cols-2">
          {resume.weakPoint && (
            <Card className="shadow-e1">
              <CardContent className="flex items-start gap-3 p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/10">
                  <Crosshair className="h-5 w-5 text-warning" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Weakest topic</p>
                  <p className="truncate font-semibold text-foreground">{resume.weakPoint.topic}</p>
                  <p className="text-sm text-muted-foreground">
                    <span data-tabular>{resume.weakPoint.accuracy}%</span> accuracy in{" "}
                    {resume.weakPoint.subjectName}
                  </p>
                  <Button asChild variant="secondary" size="sm" className="mt-2 h-9">
                    <Link href={"/dashboard/exams/" + resume.weakPoint.subjectId}>
                      Practise this subject
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {resume.lastExam && (
            <Card className="shadow-e1">
              <CardContent className="flex items-start gap-3 p-5">
                <span
                  className={
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg " +
                    (resume.lastExam.passed ? "bg-success/10" : "bg-destructive/10")
                  }
                >
                  {resume.lastExam.passed ? (
                    <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Last exam</p>
                  <p className="truncate font-semibold text-foreground">
                    {resume.lastExam.subjectName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span data-tabular>{resume.lastExam.score}%</span>
                    {" · "}
                    {resume.lastExam.passed ? "Passed" : "Not passed"}
                  </p>
                  {isFeatureEnabled("history") && (
                    <Button asChild variant="secondary" size="sm" className="mt-2 h-9">
                      <Link href="/dashboard/history">View history</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* Insights, once there is enough history to be worth reading. */}
      {hasSubjects && displayStats.totalExamsTaken > 0 && isFeatureEnabled("insights") && (
        <Card className="border-primary/20 bg-primary/5 shadow-none">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-foreground">Your insights</h2>
              <p className="text-sm text-muted-foreground">
                See where to focus next.
              </p>
            </div>
            <Button asChild variant="secondary" className="h-10 shrink-0">
              <Link href="/dashboard/insights">
                <TrendingUp className="mr-2 h-4 w-4" aria-hidden="true" />
                View insights
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Courses */}
      {hasSubjects && (
        <section>
          <SectionHeading title="My courses" count={`${purchasedSubjects.length} active`}>
            <div className="flex items-center gap-1">
              <Button asChild variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground">
                <Link href="/dashboard/learn">
                  <GraduationCap className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Learn</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground">
                <Link href="/dashboard/exams">
                  <span className="hidden sm:inline">All exams</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </SectionHeading>

          <Card className="overflow-hidden shadow-e1">
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {purchasedSubjects.map((subject) => {
                  const Icon = iconMap[subject.icon] || Plane
                  const onTrack = subject.accuracy >= 70

                  return (
                    <li
                      key={subject.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium text-foreground">{subject.name}</p>
                          <Badge variant="outline" className="hidden shrink-0 text-xs sm:inline-flex">
                            {subject.code}
                          </Badge>
                        </div>
                        <p className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{subject.questionsAttempted} questions</span>
                          {subject.accuracy > 0 && (
                            <>
                              <span aria-hidden="true">&middot;</span>
                              {/* Icon + wording carry the meaning, not the colour alone. */}
                              <span
                                className={`inline-flex items-center gap-1 ${
                                  onTrack ? "text-success" : "text-warning"
                                }`}
                              >
                                <CircleDot className="h-3 w-3" aria-hidden="true" />
                                {subject.accuracy}% accuracy
                                <span className="sr-only">
                                  {onTrack ? " - on track" : " - needs work"}
                                </span>
                              </span>
                            </>
                          )}
                        </p>
                      </div>

                      {/* Progress stays visible on mobile - it is the point of the row. */}
                      <div className="flex w-full items-center gap-2 sm:w-32">
                        <Progress value={subject.progress} className="h-1.5 flex-1" />
                        <span className="w-9 text-right text-xs font-medium text-muted-foreground">
                          {subject.progress}%
                        </span>
                      </div>

                      <Button asChild variant="secondary" size="sm" className="h-9 shrink-0 gap-1">
                        <Link href={`/dashboard/exams/${subject.id}`}>
                          Practise
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Recent exams */}
      {recentExams.length > 0 && (
        <section>
          <SectionHeading title="Recent exams">
            <Button asChild variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground">
              <Link href="/dashboard/history">
                View all
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </SectionHeading>

          <Card className="overflow-hidden shadow-e1">
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {recentExams.map((exam) => (
                  <li key={exam.id} className="flex items-center justify-between gap-4 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          exam.passed ? "bg-success/10" : "bg-destructive/10"
                        }`}
                      >
                        {exam.passed ? (
                          <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{exam.subjectName}</p>
                        <p className="text-sm text-muted-foreground">
                          {exam.passed ? "Passed" : "Not passed"}
                          <span aria-hidden="true"> &middot; </span>
                          <span className="sr-only"> on </span>
                          {exam.date}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`font-semibold ${exam.passed ? "text-success" : "text-destructive"}`}>
                        {exam.score}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {exam.correctAnswers}/{exam.totalQuestions}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Available subjects - AviPrep commerce, so not on a school portal. */}
      {lockedSubjects.length > 0 && !isWhitelabeled && (
        <section>
          <SectionHeading
            title={hasSubjects ? "More subjects" : "Get started"}
            count={`${lockedSubjects.length} available`}
          >
            <Button asChild variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground">
              <Link href="/dashboard/pricing">
                View pricing
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </SectionHeading>

          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lockedSubjects.slice(0, 6).map((subject) => {
              const Icon = iconMap[subject.icon] || Plane
              return (
                <li key={subject.id}>
                  <Link
                    href="/dashboard/pricing"
                    className="group flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Icon
                        className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{subject.name}</p>
                      <p className="text-xs text-muted-foreground">{subject.code}</p>
                    </div>
                    <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="sr-only">Locked - view pricing</span>
                  </Link>
                </li>
              )
            })}
          </ul>

          {lockedSubjects.length > 6 && (
            <div className="mt-4 text-center">
              <Button asChild variant="outline" size="sm" className="h-9 gap-1">
                <Link href="/dashboard/pricing">
                  View all {lockedSubjects.length} subjects
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          )}
        </section>
      )}

      {/* First run */}
      {!hasSubjects && recentExams.length === 0 && !isWhitelabeled && (
        <Card className="border-dashed shadow-none">
          <CardContent className="p-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <BookOpen className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Start your CPL journey</h2>
            <p className="mx-auto mb-5 max-w-md text-muted-foreground">
              Practice exams and study material for the CASA theory syllabus.
            </p>
            <Button asChild size="lg" className="h-11">
              <Link href="/dashboard/pricing">Browse subjects</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
