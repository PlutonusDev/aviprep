"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { BarChart3, BookOpen, CheckCircle2, ClipboardList, Clock, Flame, Target } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  EmptyState,
  LoadError,
  PageHeader,
  PageShell,
  PageSkeleton,
  SectionHeading,
  StatTile,
  formatMinutes,
} from "@/components/hub/page-primitives"
import { PASS_SCORE } from "@lib/insights"
import type { SubjectData, UserStats } from "@lib/types"
import { cn } from "@lib/utils"

interface ScorePoint {
  id: string
  completedAt: string
  score: number
  passed: boolean
  subjectName: string
}

interface StudyDay {
  date: string
  day: string
  minutes: number
}

interface StatsPayload {
  stats: UserStats
  recentScores: ScorePoint[]
  studyTimeData: StudyDay[]
}

// Chart ink. The mark is a darkened brand orange that clears 3:1 on the card in
// both themes; text stays on text tokens, and the grid recedes.
const MARK = "var(--chart-mark)"
const GRID = "var(--border)"
const TICK = { fill: "var(--muted-foreground)", fontSize: 12 }

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" })

export default function StatisticsContent() {
  const [data, setData] = useState<StatsPayload | null>(null)
  const [subjects, setSubjects] = useState<SubjectData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetch("/api/user/stats"), fetch("/api/user/subjects")])
      .then(async ([statsRes, subjectsRes]) => {
        if (!statsRes.ok || !subjectsRes.ok) throw new Error("load")
        const [stats, subjectsData] = await Promise.all([statsRes.json(), subjectsRes.json()])
        if (cancelled) return
        setData(stats)
        setSubjects(subjectsData.subjects ?? [])
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const bySubject = useMemo(
    () =>
      subjects
        .filter((s) => s.isPurchased && s.examsCompleted > 0)
        .sort((a, b) => b.averageScore - a.averageScore),
    [subjects],
  )

  if (loading) return <PageSkeleton tiles={5} />
  if (error || !data) return <LoadError title="We couldn't load your statistics" message="Try again in a moment." />

  const { stats, recentScores = [], studyTimeData = [] } = data
  const accuracy = stats.questionsAnswered > 0 ? Math.round((stats.correctAnswers / stats.questionsAnswered) * 100) : 0

  return (
    <PageShell>
      <PageHeader title="Statistics" description="Your scores and study time." />

      {stats.totalExams === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No stats yet"
          description="Sit a practice exam to get started."
        >
          <Button asChild className="h-10">
            <Link href="/dashboard/exams">Start a practice exam</Link>
          </Button>
        </EmptyState>
      ) : (
        <>
          <section aria-label="Totals" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatTile icon={ClipboardList} label="Exams sat" value={String(stats.totalExams)} />
            <StatTile
              icon={CheckCircle2}
              label="Pass rate"
              value={`${stats.passRate}%`}
              detail={`${stats.passedExams} of ${stats.totalExams} passed`}
            />
            <StatTile
              icon={Target}
              label="Accuracy"
              value={`${accuracy}%`}
              detail={`${stats.correctAnswers.toLocaleString()} of ${stats.questionsAnswered.toLocaleString()}`}
            />
            <StatTile
              icon={Flame}
              label="Study streak"
              value={`${stats.studyStreak} ${stats.studyStreak === 1 ? "day" : "days"}`}
            />
            <StatTile icon={Clock} label="Time studied" value={`${stats.totalStudyHours}h`} />
          </section>

          <ScoreTrend points={recentScores} />

          <div className="grid gap-8 lg:grid-cols-5">
            <section aria-label="Average score by subject" className="lg:col-span-3">
              <SectionHeading title="By subject" description={`Average score vs the ${PASS_SCORE}% pass mark`} />
              <SubjectBars subjects={bySubject} />
            </section>

            <section aria-label="Study time, last 7 days" className="lg:col-span-2">
              <SectionHeading
                title="Last 7 days"
                description={`${formatMinutes(studyTimeData.reduce((n, d) => n + d.minutes, 0))} studied`}
              />
              <StudyWeek days={studyTimeData} />
            </section>
          </div>
        </>
      )}
    </PageShell>
  )
}

/* --- Score trend ----------------------------------------------------------- */

function ScoreTrend({ points }: { points: ScorePoint[] }) {
  const chartData = points.map((p, i) => ({ ...p, n: i + 1, label: shortDate(p.completedAt) }))

  // The one hero figure on the page: where recent scores sit, and which way they're heading.
  // A comparison is only shown with enough sittings on both sides to mean anything.
  const span = Math.max(1, Math.min(5, Math.floor(points.length / 2)))
  const avg = (list: ScorePoint[]) => Math.round(list.reduce((n, p) => n + p.score, 0) / list.length)
  const recent = points.length ? avg(points.slice(-span)) : 0
  const change = span >= 3 ? recent - avg(points.slice(-span * 2, -span)) : null

  return (
    <section aria-label="Score trend">
      <Card className="shadow-e1">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Score trend</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Last {points.length} {points.length === 1 ? "exam" : "exams"}
              </p>
            </div>
            {points.length > 0 && (
              <div className="text-right">
                <p className="text-display-3 font-bold leading-none text-foreground">{recent}%</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {span > 1 ? `Last ${span} average` : "Latest score"}
                  {change !== null && change !== 0 && (
                    <>
                      {" · "}
                      <span className="font-medium text-foreground">
                        {change > 0 ? "up" : "down"} {Math.abs(change)} pts
                      </span>
                    </>
                  )}
                </p>
              </div>
            )}
          </div>

          {points.length < 2 ? (
            <p className="mt-6 rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Sit another exam to see your trend.
            </p>
          ) : (
            <>
              <div className="mt-6 h-64" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                    <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
                    <XAxis
                      dataKey="n"
                      tickFormatter={(n: number) => chartData[n - 1]?.label ?? ""}
                      tick={TICK}
                      tickLine={false}
                      axisLine={{ stroke: GRID }}
                      minTickGap={24}
                    />
                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                      tickFormatter={(v: number) => `${v}%`}
                      tick={TICK}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                    />
                    <ReferenceLine
                      y={PASS_SCORE}
                      stroke="var(--muted-foreground)"
                      strokeDasharray="4 4"
                      label={{ value: `Pass ${PASS_SCORE}%`, position: "insideTopLeft", ...TICK }}
                    />
                    <Tooltip
                      cursor={{ stroke: GRID }}
                      content={({ active, payload }) => {
                        const p = active && payload?.[0] ? (payload[0].payload as ScorePoint & { label: string }) : null
                        if (!p) return null
                        return (
                          <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm shadow-e2">
                            <p className="font-medium text-foreground">{p.score}%</p>
                            <p className="text-xs text-muted-foreground">{p.subjectName}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.label} · {p.passed ? "Passed" : "Not passed"}
                            </p>
                          </div>
                        )
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke={MARK}
                      strokeWidth={2}
                      dot={{ r: 3, fill: MARK, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: MARK, stroke: "var(--card)", strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* The same numbers for screen readers and anyone who'd rather read than squint. */}
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Show as a table
                </summary>
                <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                      <tr>
                        <th scope="col" className="px-3 py-2 font-medium">Date</th>
                        <th scope="col" className="px-3 py-2 font-medium">Subject</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {[...chartData].reverse().map((p) => (
                        <tr key={p.id}>
                          <td className="px-3 py-2 text-muted-foreground">{p.label}</td>
                          <td className="px-3 py-2 text-foreground">{p.subjectName}</td>
                          <td className="px-3 py-2 text-right text-foreground" data-tabular>
                            {p.score}%<span className="sr-only">, {p.passed ? "passed" : "not passed"}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

/* --- Subjects ---------------------------------------------------------------- */

/**
 * Horizontal bars as plain markup: the labels are long subject names, which a
 * chart library would truncate, and every row doubles as its own table row.
 * One hue for every bar - status is carried by the pass-mark line and the words.
 */
function SubjectBars({ subjects }: { subjects: SubjectData[] }) {
  if (subjects.length === 0) {
    return (
      <Card className="border-dashed shadow-none">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No subject results yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-e1">
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {subjects.map((s) => {
            const below = s.averageScore < PASS_SCORE
            return (
              <li key={s.id}>
                <Link
                  href={`/dashboard/exams/${s.id}`}
                  className="block px-5 py-4 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate font-medium text-foreground">{s.name}</p>
                    <p className="shrink-0 font-semibold text-foreground" data-tabular>
                      {s.averageScore}%
                    </p>
                  </div>
                  <div className="relative mt-2 h-2 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(2, Math.min(100, s.averageScore))}%`, background: MARK }}
                    />
                    <span
                      aria-hidden="true"
                      className="absolute -top-1 h-4 w-0.5 rounded-full bg-foreground/60"
                      style={{ left: `${PASS_SCORE}%` }}
                    />
                  </div>
                  <p className="mt-1.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                    <span>{s.code}</span>
                    <span aria-hidden="true">&middot;</span>
                    <span>
                      {s.examsCompleted} {s.examsCompleted === 1 ? "exam" : "exams"}
                    </span>
                    <span aria-hidden="true">&middot;</span>
                    <span>{s.questionsAttempted} questions</span>
                    <span aria-hidden="true">&middot;</span>
                    <span className={cn(below ? "font-medium text-foreground" : undefined)}>
                      {below ? `${PASS_SCORE - s.averageScore} below pass` : "Passing"}
                    </span>
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}

/* --- Study time ------------------------------------------------------------ */

function StudyWeek({ days }: { days: StudyDay[] }) {
  const total = days.reduce((n, d) => n + d.minutes, 0)

  return (
    <Card className="shadow-e1">
      <CardContent className="p-5">
        {total === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <BookOpen className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-sm text-muted-foreground">No study time this week.</p>
          </div>
        ) : (
          <>
            <div className="h-56" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={days} margin={{ top: 8, right: 4, bottom: 0, left: -16 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="day" tick={TICK} tickLine={false} axisLine={{ stroke: GRID }} interval={0} />
                  <YAxis
                    allowDecimals={false}
                    tickFormatter={(v: number) => (v >= 60 ? `${Math.round(v / 60)}h` : `${v}m`)}
                    tick={TICK}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                    content={({ active, payload }) => {
                      const d = active && payload?.[0] ? (payload[0].payload as StudyDay) : null
                      if (!d) return null
                      return (
                        <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm shadow-e2">
                          <p className="font-medium text-foreground">{formatMinutes(d.minutes)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(`${d.date}T00:00:00`).toLocaleDateString("en-AU", {
                              weekday: "long",
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="minutes" fill={MARK} radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="sr-only">
              <caption>Minutes studied per day, last 7 days</caption>
              <tbody>
                {days.map((d) => (
                  <tr key={d.date}>
                    <th scope="row">{d.day}</th>
                    <td>{formatMinutes(d.minutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </CardContent>
    </Card>
  )
}
