"use client"

import Link from "next/link"
import { ArrowRight, Users } from "lucide-react"
import { PresenceSummary, StatusDot, StatusPill, useLive } from "@/components/demo/live"
import { Initials, Panel, ScoreBars } from "@/components/demo/bits"
import { PRESENCE } from "@lib/demo/presence"
import {
  DEMO_GROUPS,
  DEMO_SCHOOL,
  DEMO_STUDENTS,
  PASS_MARK,
  STALLED_AFTER_DAYS,
  attemptsFor,
  averageOf,
  membersOf,
  schoolStats,
  studentSummary,
  subjectCode,
} from "@lib/demo/school"
import { cn } from "@lib/utils"

const stats = schoolStats()

const behind = DEMO_STUDENTS.map((s) => ({ student: s, ...studentSummary(s) }))
  .filter((s) => s.stalled || (s.averageScore !== null && s.averageScore < PASS_MARK))
  .sort((a, b) => (a.averageScore ?? 100) - (b.averageScore ?? 100))
  .slice(0, 5)

const trend = DEMO_STUDENTS.flatMap((s) => attemptsFor(s.id))
  .sort((a, b) => b.daysAgo - a.daysAgo)
  .slice(-48)
  .map((a) => a.score)

/** Whole minutes ago, or the day, for the feed. */
function when(at: number) {
  if (at <= 0) {
    const days = Math.round(-at / 86_400_000)
    return days === 0 ? "today" : days === 1 ? "yesterday" : `${days}d ago`
  }
  const mins = Math.max(0, Math.round((Date.now() - at) / 60000))
  return mins < 1 ? "just now" : `${mins}m ago`
}

function Tile({ label, value, foot, children }: { label: string; value: string; foot?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      {foot && <div className="mt-1 text-xs text-muted-foreground">{foot}</div>}
      {children}
    </div>
  )
}

export default function DemoDashboard() {
  const { activeNow, feed, counts } = useLive()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{DEMO_SCHOOL.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {stats.students} students · {DEMO_GROUPS.length} groups · {DEMO_SCHOOL.tier} plan
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="On AviPrep now"
          value={String(activeNow)}
          foot={
            <span className="inline-flex items-center gap-1.5">
              <StatusDot state="online" />
              {counts.exam > 0 ? `${counts.exam} sitting an exam` : `${counts.course} in a course`}
            </span>
          }
        />
        <Tile label="Cohort average" value={`${stats.averageScore}%`} foot={`${stats.atOrAbovePass} of ${stats.students} at or above ${PASS_MARK}%`} />
        <Tile label="Exams sat" value={String(stats.exams)} foot="All time" />
        <Tile label="Falling behind" value={String(behind.length)} foot={`Under ${PASS_MARK}%, or quiet ${STALLED_AFTER_DAYS} days`} />
      </div>

      <Panel
        title="Right now"
        description={`${DEMO_STUDENTS.length} students`}
        action={
          <Link href="/demo/students" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            All students
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      >
        <PresenceSummary className="mb-4" />
        <LiveGrid />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-5">
        <Panel className="lg:col-span-3" title="Results as they land">
          <ul className="divide-y divide-border">
            {feed.map((entry, i) => (
              <li
                key={entry.id}
                className={cn("flex items-center gap-3 py-2.5 first:pt-0", i === 0 && entry.at > 0 && "animate-in fade-in slide-in-from-top-1 duration-500")}
              >
                <Initials first={entry.name.split(" ")[0]} last={entry.name.split(" ")[1] ?? ""} className="h-8 w-8 text-[11px]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{entry.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.detail} · {when(entry.at)}
                  </p>
                </div>
                {entry.score !== undefined && (
                  <span
                    className={cn(
                      "shrink-0 rounded px-2 py-0.5 text-sm font-semibold tabular-nums",
                      entry.passed ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive",
                    )}
                  >
                    {entry.score}%
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Panel>

        <div className="space-y-6 lg:col-span-2">
          <Panel title={`Under ${PASS_MARK}%`}>
            {behind.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nobody.</p>
            ) : (
              <ul className="divide-y divide-border">
                {behind.map(({ student, averageScore, stalled }) => (
                  <li key={student.id}>
                    <Link href={`/demo/students/${student.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/60">
                      <Initials first={student.firstName} last={student.lastName} className="h-8 w-8 text-[11px]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {stalled ? `Quiet ${student.lastSeenDays} days` : <StatusPill studentId={student.id} />}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-warning">
                        {averageScore !== null ? `${averageScore}%` : "—"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Groups">
            <ul className="space-y-3">
              {DEMO_GROUPS.map((g) => {
                const members = membersOf(g.id)
                const average = averageOf(members.flatMap((m) => attemptsFor(m.id))) ?? 0
                return (
                  <li key={g.id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: g.color }} />
                        <span className="truncate text-sm font-medium text-foreground">{g.name}</span>
                      </span>
                      <span className={cn("shrink-0 text-sm font-semibold tabular-nums", average >= PASS_MARK ? "text-success" : "text-warning")}>
                        {average}%
                      </span>
                    </div>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" aria-hidden="true" />
                      {members.length} · {g.subjectIds.map(subjectCode).join(" ")}
                    </p>
                  </li>
                )
              })}
            </ul>
          </Panel>

          <Panel title="Every sitting" description={`Oldest to newest. The line is ${PASS_MARK}%.`}>
            <ScoreBars className="h-24" passMark={PASS_MARK} scores={trend} />
          </Panel>
        </div>
      </div>
    </div>
  )
}

/** Everyone, as a wall of avatars that change while you watch. */
function LiveGrid() {
  const { presence, changed } = useLive()

  const sorted = [...DEMO_STUDENTS].sort((a, b) => {
    const rank = (id: string) => {
      const key = presence[id] ?? "offline"
      return ["exam", "course", "forum", "online", "idle", "offline"].indexOf(key)
    }
    return rank(a.id) - rank(b.id) || a.firstName.localeCompare(b.firstName)
  })

  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {sorted.map((student) => {
        const key = presence[student.id] ?? "offline"
        const def = PRESENCE[key]
        return (
          <li key={student.id}>
            <Link
              href={`/demo/students/${student.id}`}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border border-border px-2.5 py-2 transition-colors hover:border-primary/40 hover:bg-muted/50",
                !def.active && "opacity-60",
                changed.has(student.id) && "border-primary/50 bg-primary/5",
              )}
            >
              <span className="relative shrink-0">
                <Initials first={student.firstName} last={student.lastName} className="h-8 w-8 text-[11px]" />
                <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-card p-0.5">
                  <StatusDot state={key} />
                </span>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium text-foreground">
                  {student.firstName} {student.lastName[0]}.
                </span>
                <span className={cn("block truncate text-[11px]", def.tone)}>{def.label}</span>
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
