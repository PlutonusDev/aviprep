"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  CheckCircle2,
  XCircle,
  Search,
  Clock,
  ChevronRight,
  RotateCcw,
  ClipboardList,
  Target,
  Trophy,
  History,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import type { ExamHistoryItem } from "@lib/types"
import { cn } from "@lib/utils"

type Sort = "newest" | "oldest" | "highest" | "lowest"
type ResultFilter = "all" | "passed" | "failed"

const SORTS: { id: Sort; label: string }[] = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "highest", label: "Highest score" },
  { id: "lowest", label: "Lowest score" },
]

export default function HistoryContent() {
  const [history, setHistory] = useState<ExamHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [query, setQuery] = useState("")
  const [subject, setSubject] = useState("all")
  const [result, setResult] = useState<ResultFilter>("all")
  const [sort, setSort] = useState<Sort>("newest")

  useEffect(() => {
    let cancelled = false
    fetch("/api/user/history")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data) => !cancelled && setHistory(data.history ?? []))
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  // Only subjects the student has actually sat - not every subject they own.
  const subjectOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const e of history) if (!seen.has(e.subjectId)) seen.set(e.subjectId, e.subjectName)
    return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [history])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return history
      .filter(
        (e) =>
          (!q || e.subjectName.toLowerCase().includes(q)) &&
          (subject === "all" || e.subjectId === subject) &&
          (result === "all" || (result === "passed" ? e.passed : !e.passed)),
      )
      .sort((a, b) => {
        const byDate = new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
        switch (sort) {
          case "oldest":
            return byDate
          case "highest":
            return b.score - a.score || -byDate
          case "lowest":
            return a.score - b.score || -byDate
          default:
            return -byDate
        }
      })
  }, [history, query, subject, result, sort])

  if (loading) return <PageSkeleton />
  if (error) return <LoadError title="We couldn't load your history" message="Try again in a moment." />

  const total = history.length
  const passed = history.filter((e) => e.passed).length
  const average = total ? Math.round(history.reduce((n, e) => n + e.score, 0) / total) : 0
  const best = total ? Math.max(...history.map((e) => e.score)) : 0
  const minutes = history.reduce((n, e) => n + e.timeSpent, 0)
  const filtering = query !== "" || subject !== "all" || result !== "all"

  const clearFilters = () => {
    setQuery("")
    setSubject("all")
    setResult("all")
  }

  return (
    <PageShell>
      <PageHeader title="Exam history" description="Every exam you've sat.">
        {total > 0 && (
          <Button asChild size="lg" className="h-11 shrink-0 gap-2">
            <Link href="/dashboard/exams">
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              New exam
            </Link>
          </Button>
        )}
      </PageHeader>

      {total === 0 ? (
        <EmptyState
          icon={History}
          title="No exams yet"
          description="Your exams will show up here."
        >
          <Button asChild className="h-10">
            <Link href="/dashboard/exams">Start a practice exam</Link>
          </Button>
        </EmptyState>
      ) : (
        <>
          <section aria-label="History at a glance" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile icon={ClipboardList} label="Exams sat" value={String(total)} />
            <StatTile
              icon={CheckCircle2}
              label="Pass rate"
              value={`${Math.round((passed / total) * 100)}%`}
              detail={`${passed} of ${total} passed`}
            />
            <StatTile icon={Target} label="Average score" value={`${average}%`} detail={`Best ${best}%`} />
            <StatTile icon={Clock} label="Time spent" value={formatMinutes(minutes)} />
          </section>

          <section aria-label="Attempts">
            <SectionHeading
              title="Attempts"
              count={filtering ? `${visible.length} of ${total}` : String(total)}
            />

            {/* Toolbar */}
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  aria-label="Search by subject"
                  placeholder="Search by subject"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-10 pl-9"
                />
              </div>

              {subjectOptions.length > 1 && (
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger className="h-10 w-full md:w-52" aria-label="Subject">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All subjects</SelectItem>
                    {subjectOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div role="radiogroup" aria-label="Result" className="flex h-10 rounded-md border border-border p-0.5">
                {(["all", "passed", "failed"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={result === r}
                    onClick={() => setResult(r)}
                    className={cn(
                      "flex-1 rounded px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex-none",
                      result === r
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {r === "all" ? "All" : r === "passed" ? "Passed" : "Not passed"}
                  </button>
                ))}
              </div>

              <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
                <SelectTrigger className="h-10 w-full md:w-40" aria-label="Sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORTS.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {visible.length === 0 ? (
              <Card className="border-dashed shadow-none">
                <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                  <p className="text-sm text-muted-foreground">No exams match these filters.</p>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={clearFilters}>
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    Clear filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="overflow-hidden shadow-e1">
                <CardContent className="p-0">
                  <ul className="divide-y divide-border">
                    {visible.map((exam) => (
                      <AttemptRow key={exam.id} exam={exam} isBest={exam.score === best && best > 0} />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </section>
        </>
      )}
    </PageShell>
  )
}

function AttemptRow({ exam, isBest }: { exam: ExamHistoryItem; isBest: boolean }) {
  const when = new Date(exam.completedAt)
  const time = when.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })

  return (
    <li className="group relative flex items-center gap-4 p-4 transition-colors hover:bg-muted/40 has-[a:focus-visible]:bg-muted/40 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-inset has-[a:focus-visible]:ring-ring">
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          exam.passed ? "bg-success/10" : "bg-destructive/10",
        )}
      >
        {exam.passed ? (
          <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
        ) : (
          <XCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        {/* The subject is the row's link; its ::after stretches the hit area over the whole row. */}
        <Link
          href={`/dashboard/history/${exam.id}`}
          className="block truncate font-medium text-foreground after:absolute after:inset-0 focus-visible:outline-none"
        >
          {exam.subjectName}
          <span className="sr-only">, review answers</span>
        </Link>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          <span>
            {exam.date}, {time}
          </span>
          <span aria-hidden="true">&middot;</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {formatMinutes(exam.timeSpent)}
          </span>
          {isBest && (
            <>
              <span aria-hidden="true">&middot;</span>
              <span className="inline-flex items-center gap-1 text-foreground">
                <Trophy className="h-3 w-3 text-primary" aria-hidden="true" />
                Best score
              </span>
            </>
          )}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-semibold text-foreground" data-tabular>
          {exam.score}%
        </p>
        <p className={cn("text-xs", exam.passed ? "text-success" : "text-destructive")}>
          {exam.passed ? "Passed" : "Not passed"}
        </p>
      </div>

      <div className="relative z-10 hidden shrink-0 items-center gap-1 sm:flex">
        <Button asChild variant="ghost" size="sm" className="h-9 gap-1.5 text-muted-foreground">
          <Link href={`/dashboard/exams/${exam.subjectId}`} aria-label={`Sit ${exam.subjectName} again`}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </Link>
        </Button>
      </div>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </li>
  )
}
