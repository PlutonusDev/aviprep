"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { ArrowLeft, BookOpen, Clock, Loader2, Target, TrendingDown } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SUBJECTS } from "@lib/subjects"
import { cn } from "@lib/utils"

/**
 * One student's progress, opened from the Students table. This is where the
 * old Progress tab's numbers live now, per student rather than in a league
 * table nobody could act on.
 */

const PASS_MARK = 70

interface Attempt {
  id: string
  subjectId: string
  subjectName: string
  score: number
  passed: boolean
  totalQuestions: number
  correctAnswers: number
  timeSpentMins: number
  completedAt: string
}

interface Detail {
  student: {
    id: string
    email: string
    firstName: string
    lastName: string
    arn: string
    phone: string
    profilePicture: string | null
    enrolledAt: string | null
    createdAt: string
  }
  stats: { totalExams: number; passedExams: number; passRate: number; averageScore: number | null; totalStudyTime: number }
  examAttempts: Attempt[]
  weakPoints: { id: string; topic: string; subjectName: string; accuracy: number; priority: string }[]
  subjectProgress: Record<string, { attempts: number; avgScore: number; passed: number }>
}

function Stat({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xl font-semibold text-foreground" data-tabular>
            {value}
          </p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

/** Every sitting for one subject, against the pass mark. */
function SubjectBars({ attempts }: { attempts: Attempt[] }) {
  const inOrder = [...attempts].reverse()
  return (
    <div aria-hidden="true" className="relative h-16">
      <div className="absolute inset-x-0 z-10 flex items-center" style={{ bottom: `${PASS_MARK}%` }}>
        <span className="h-px flex-1 border-t border-dashed border-foreground/30" />
      </div>
      <div className="flex h-full items-end gap-1">
        {inOrder.map((a) => (
          <div
            key={a.id}
            title={`${a.score}% on ${format(new Date(a.completedAt), "d MMM yyyy")}`}
            className={cn("min-w-[3px] flex-1 rounded-t-[2px]", a.passed ? "bg-success" : "bg-destructive/60")}
            style={{ height: `${Math.max(a.score, 2)}%` }}
          />
        ))}
      </div>
    </div>
  )
}

export default function StudentProgressPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = use(params)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading")

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`/api/school/students/${studentId}`)
        if (!res.ok) return setState("missing")
        setDetail(await res.json())
        setState("ready")
      } catch {
        setState("missing")
      }
    })()
  }, [studentId])

  if (state === "loading") {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    )
  }

  if (state === "missing" || !detail) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="text-sm text-muted-foreground">That student isn&rsquo;t at your school, or has been removed.</p>
        <Link href="/school/students" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Back to students
        </Link>
      </div>
    )
  }

  const { student, stats, examAttempts, weakPoints, subjectProgress } = detail
  const subjectName = (id: string) => SUBJECTS.find((s) => s.id === id)?.name ?? id
  const hours = Math.floor(stats.totalStudyTime / 60)

  const bySubject = Object.entries(subjectProgress)
    .map(([id, p]) => ({ id, ...p, attempts_: examAttempts.filter((a) => a.subjectId === id) }))
    .sort((a, b) => a.avgScore - b.avgScore)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/school/students" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Students
      </Link>

      <div className="flex flex-wrap items-center gap-4">
        <Avatar className="h-14 w-14 shrink-0">
          <AvatarImage src={student.profilePicture || undefined} />
          <AvatarFallback className="bg-primary/10 text-base font-semibold text-foreground">
            {student.firstName[0]}
            {student.lastName[0]}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {student.firstName} {student.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {student.email} <span aria-hidden="true">·</span> ARN <span className="font-mono">{student.arn}</span>
            {student.enrolledAt && (
              <>
                {" "}
                <span aria-hidden="true">·</span> enrolled {formatDistanceToNow(new Date(student.enrolledAt), { addSuffix: true })}
              </>
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Average score"
          value={stats.averageScore !== null ? `${stats.averageScore}%` : "—"}
          sub={stats.averageScore !== null ? (stats.averageScore >= PASS_MARK ? "Above the pass mark" : "Below the pass mark") : undefined}
          icon={Target}
        />
        <Stat label="Practice exams" value={String(stats.totalExams)} sub={`${stats.passedExams} passed`} icon={BookOpen} />
        <Stat label="Pass rate" value={`${stats.passRate}%`} icon={Target} />
        <Stat label="Study time" value={hours >= 1 ? `${hours}h` : `${stats.totalStudyTime}m`} sub="Last 30 sessions" icon={Clock} />
      </div>

      {stats.totalExams === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No practice exams sat yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">By subject</CardTitle>
              <CardDescription>Every sitting, oldest to newest. The dashed line is 70%.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-0">
              {bySubject.map((s) => (
                <div key={s.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium text-foreground">{subjectName(s.id)}</p>
                    <p className="shrink-0 text-sm text-muted-foreground">
                      <span className={cn("font-semibold", s.avgScore >= PASS_MARK ? "text-success" : "text-foreground")} data-tabular>
                        {s.avgScore}%
                      </span>{" "}
                      over {s.attempts} {s.attempts === 1 ? "sitting" : "sittings"}
                    </p>
                  </div>
                  <div className="mt-2">
                    <SubjectBars attempts={s.attempts_} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6">
            {weakPoints.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingDown className="h-4 w-4 text-warning" aria-hidden="true" />
                    Weakest topics
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-3">
                    {weakPoints.map((w) => (
                      <li key={w.id}>
                        <p className="text-sm font-medium text-foreground">{w.topic}</p>
                        <p className="text-xs text-muted-foreground">
                          {w.subjectName} <span aria-hidden="true">·</span> {Math.round(w.accuracy)}% correct
                        </p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent exams</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="divide-y divide-border">
                  {examAttempts.slice(0, 8).map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">{a.subjectName || subjectName(a.subjectId)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(a.completedAt), "d MMM yyyy")} <span aria-hidden="true">·</span> {a.correctAnswers}/{a.totalQuestions}
                        </p>
                      </div>
                      <Badge variant={a.passed ? "default" : "secondary"} className="shrink-0" data-tabular>
                        {a.score}%
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
