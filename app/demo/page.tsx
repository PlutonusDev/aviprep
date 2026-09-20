import Link from "next/link"
import { AlertTriangle, ArrowRight, BookOpen, Target, TrendingUp, Users } from "lucide-react"
import { Panel, PageHead, ScoreBars, Stat, Initials } from "@/components/demo/bits"
import {
  DEMO_GROUPS,
  DEMO_STUDENTS,
  PASS_MARK,
  STALLED_AFTER_DAYS,
  attemptsFor,
  membersOf,
  schoolStats,
  studentSummary,
  subjectCode,
} from "@lib/demo/school"

/** The first screen a school sees: is the cohort on track, and who isn't. */
export default function DemoDashboard() {
  const stats = schoolStats()

  const needAttention = DEMO_STUDENTS.map((s) => ({ student: s, ...studentSummary(s) }))
    .filter((s) => s.stalled || (s.averageScore !== null && s.averageScore < PASS_MARK))
    .sort((a, b) => (a.averageScore ?? 100) - (b.averageScore ?? 100))
    .slice(0, 5)

  const recent = DEMO_STUDENTS.flatMap((s) => attemptsFor(s.id).map((a) => ({ ...a, student: s })))
    .sort((a, b) => a.daysAgo - b.daysAgo)
    .slice(0, 6)

  return (
    <div className="mx-auto max-w-6xl">
      <PageHead
        title="Dashboard"
        blurb="Where a school starts its week: how the cohort is tracking, and who to call."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Students enrolled" value={String(stats.students)} sub={`${stats.seats - stats.students} seats spare`} icon={Users} />
        <Stat label="Cohort average" value={`${stats.averageScore}%`} sub={`Pass mark ${PASS_MARK}%`} icon={Target} tone={stats.averageScore >= PASS_MARK ? "good" : undefined} />
        <Stat label="Practice exams sat" value={String(stats.exams)} sub={`${stats.atOrAbovePass} students at or above the pass mark`} icon={BookOpen} />
        <Stat
          label="Haven't opened it"
          value={String(stats.stalled)}
          sub={`In ${STALLED_AFTER_DAYS} days or more`}
          icon={AlertTriangle}
          tone={stats.stalled ? "warn" : undefined}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Worth a word"
          description="Below the pass mark, or gone quiet. The list a chief theory instructor works from."
        >
          <ul className="divide-y divide-border">
            {needAttention.map(({ student, averageScore, stalled, examCount }) => (
              <li key={student.id}>
                <Link href={`/demo/students/${student.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/60">
                  <Initials first={student.firstName} last={student.lastName} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {student.firstName} {student.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stalled ? `Last opened it ${student.lastSeenDays} days ago` : `${examCount} exams sat`}
                    </p>
                  </div>
                  <span className="shrink-0 text-right">
                    <span
                      className={`block text-sm font-semibold ${averageScore !== null && averageScore >= PASS_MARK ? "text-foreground" : "text-warning"}`}
                      data-tabular
                    >
                      {averageScore !== null ? `${averageScore}%` : "—"}
                    </span>
                    <span className="block text-xs text-muted-foreground">average</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Groups" description="Classes, intakes or courses.">
          <ul className="space-y-3">
            {DEMO_GROUPS.map((g) => {
              const members = membersOf(g.id)
              const scores = members.flatMap((m) => attemptsFor(m.id).map((a) => a.score))
              const average = scores.length ? Math.round(scores.reduce((n, s) => n + s, 0) / scores.length) : 0
              return (
                <li key={g.id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: g.color }} />
                      <span className="truncate text-sm font-medium text-foreground">{g.name}</span>
                    </span>
                    <span className="shrink-0 text-sm text-muted-foreground" data-tabular>
                      {average}%
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {members.length} students · {g.subjectIds.map(subjectCode).join(", ") || "no subjects yet"}
                  </p>
                </li>
              )
            })}
          </ul>
          <Link href="/demo/groups" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Manage groups
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title="Latest sittings" description="Every practice exam, as it happens.">
          <ul className="divide-y divide-border">
            {recent.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">
                    {a.student.firstName} {a.student.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {subjectCode(a.subjectId)} · {a.correctAnswers}/{a.totalQuestions} · {a.daysAgo === 0 ? "today" : `${a.daysAgo}d ago`}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-sm font-semibold ${a.passed ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"}`}
                  data-tabular
                >
                  {a.score}%
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Cohort trend" description="Every sitting across the school, oldest to newest.">
          <ScoreBars
            className="h-28"
            passMark={PASS_MARK}
            scores={DEMO_STUDENTS.flatMap((s) => attemptsFor(s.id))
              .sort((a, b) => b.daysAgo - a.daysAgo)
              .slice(-48)
              .map((a) => a.score)}
          />
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            The dashed line is the {PASS_MARK}% pass mark.
          </p>
        </Panel>
      </div>
    </div>
  )
}
