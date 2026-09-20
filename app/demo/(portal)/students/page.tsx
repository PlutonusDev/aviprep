"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search, UserPlus } from "lucide-react"
import { Initials, Panel } from "@/components/demo/bits"
import { PresenceSummary, StatusDot, useLive } from "@/components/demo/live"
import { PRESENCE } from "@lib/demo/presence"
import { PASS_MARK, groupById, rosterByGroup, studentSummary, subjectCode, type DemoStudent } from "@lib/demo/school"
import { cn } from "@lib/utils"

const SUMMARY = new Map(rosterByGroup.map((s) => [s.id, studentSummary(s)]))

function sections(students: DemoStudent[]) {
  const out: { key: string; name: string; color: string | null; students: DemoStudent[] }[] = []
  for (const student of students) {
    const group = groupById(student.groupId)
    const key = group?.id ?? "__none"
    const last = out[out.length - 1]
    if (last?.key === key) last.students.push(student)
    else out.push({ key, name: group?.name ?? "No group", color: group?.color ?? null, students: [student] })
  }
  return out
}

export default function DemoStudents() {
  const { presence, changed } = useLive()
  const [query, setQuery] = useState("")

  const matching = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rosterByGroup
    return rosterByGroup.filter((s) => `${s.firstName} ${s.lastName} ${s.email} ${s.arn}`.toLowerCase().includes(q))
  }, [query])

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Students</h1>
          <p className="mt-1 text-sm text-muted-foreground">{rosterByGroup.length} enrolled</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Add a student
        </span>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, email or ARN"
            aria-label="Search students"
            className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <PresenceSummary />
      </div>

      <Panel className="overflow-hidden" >
        <div className="-mx-5 -my-5 overflow-x-auto">
          <table className="w-full min-w-[52rem] text-sm">
            <caption className="sr-only">Students, grouped by class</caption>
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-5 py-3 font-medium">Student</th>
                <th scope="col" className="px-3 py-3 font-medium">Status</th>
                <th scope="col" className="px-3 py-3 font-medium">ARN</th>
                <th scope="col" className="px-3 py-3 text-center font-medium">Exams</th>
                <th scope="col" className="px-3 py-3 text-center font-medium">Average</th>
                <th scope="col" className="px-5 py-3 font-medium">Subjects</th>
              </tr>
            </thead>
            {matching.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    Nobody matches &ldquo;{query}&rdquo;.
                  </td>
                </tr>
              </tbody>
            ) : (
              sections(matching).map((section) => (
                <tbody key={section.key}>
                  <tr>
                    <th scope="colgroup" colSpan={6} className="bg-muted/40 px-5 py-1.5 text-left">
                      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {section.color && <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: section.color }} />}
                        {section.name}
                        <span className="font-normal normal-case tracking-normal">{section.students.length}</span>
                      </span>
                    </th>
                  </tr>
                  {section.students.map((student) => {
                    const summary = SUMMARY.get(student.id)!
                    const key = presence[student.id] ?? "offline"
                    const def = PRESENCE[key]
                    return (
                      <tr
                        key={student.id}
                        className={cn(
                          "border-b border-border transition-colors last:border-b-0 hover:bg-muted/40",
                          changed.has(student.id) && "bg-primary/5",
                        )}
                      >
                        <td className="px-5 py-2.5">
                          <Link href={`/demo/students/${student.id}`} className="flex items-center gap-3 hover:underline">
                            <Initials first={student.firstName} last={student.lastName} className="h-8 w-8 text-[11px]" />
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-foreground">
                                {student.firstName} {student.lastName}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">{student.email}</span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-xs", def.tone)}>
                            <StatusDot state={key} />
                            {def.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{student.arn}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums text-muted-foreground">{summary.examCount}</td>
                        <td className="px-3 py-2.5 text-center">
                          {summary.averageScore !== null ? (
                            <span
                              className={cn(
                                "rounded px-2 py-0.5 text-xs font-semibold tabular-nums",
                                summary.averageScore >= PASS_MARK ? "bg-success/15 text-success" : "bg-warning/15 text-foreground",
                              )}
                            >
                              {summary.averageScore}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-xs text-muted-foreground">{student.subjectIds.map(subjectCode).join(" ")}</td>
                      </tr>
                    )
                  })}
                </tbody>
              ))
            )}
          </table>
        </div>
      </Panel>
    </div>
  )
}
