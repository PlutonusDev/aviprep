import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, BookOpen, Clock, Target, TrendingDown } from "lucide-react"
import { Initials, Panel, ScoreBars, Stat } from "@/components/demo/bits"
import { DEMO_STUDENTS, PASS_MARK, averageOf, groupById, studentSummary, subjectCode, subjectName } from "@lib/demo/school"

export function generateStaticParams() {
  return DEMO_STUDENTS.map((s) => ({ studentId: s.id }))
}

/** One student, the way an instructor reads them before a progress check. */
export default async function DemoStudent({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params
  const student = DEMO_STUDENTS.find((s) => s.id === studentId)
  if (!student) notFound()

  const summary = studentSummary(student)
  const group = groupById(student.groupId)
  const hours = Math.floor(summary.studyMinutes / 60)

  const bySubject = student.subjectIds
    .map((id) => {
      const attempts = summary.attempts.filter((a) => a.subjectId === id)
      return { id, attempts, average: averageOf(attempts) ?? 0 }
    })
    .filter((s) => s.attempts.length)
    .sort((a, b) => a.average - b.average)

  const weakest = bySubject.slice(0, 3)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/demo/students" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Students
      </Link>

      <div className="flex flex-wrap items-center gap-4">
        <Initials first={student.firstName} last={student.lastName} className="h-14 w-14 text-base" />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {student.firstName} {student.lastName}
          </h1>
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            <span>{student.email}</span>
            <span aria-hidden="true">·</span>
            <span>
              ARN <span className="font-mono">{student.arn}</span>
            </span>
            {group && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: group.color }} />
                  {group.name}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Average score"
          value={summary.averageScore !== null ? `${summary.averageScore}%` : "—"}
          sub={summary.averageScore !== null ? (summary.averageScore >= PASS_MARK ? "Above the pass mark" : "Below the pass mark") : undefined}
          icon={Target}
          tone={summary.averageScore !== null && summary.averageScore >= PASS_MARK ? "good" : "warn"}
        />
        <Stat label="Practice exams" value={String(summary.examCount)} sub={`${summary.passedExams} passed`} icon={BookOpen} />
        <Stat label="Pass rate" value={`${summary.passRate}%`} icon={Target} />
        <Stat label="Study time" value={hours >= 1 ? `${hours}h` : `${summary.studyMinutes}m`} icon={Clock} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title="By subject" description={`Every sitting, oldest to newest. The dashed line is ${PASS_MARK}%.`}>
          <div className="space-y-5">
            {bySubject.map((s) => (
              <div key={s.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-medium text-foreground">{subjectName(s.id)}</p>
                  <p className="shrink-0 text-sm text-muted-foreground">
                    <span className={`font-semibold ${s.average >= PASS_MARK ? "text-success" : "text-foreground"}`} data-tabular>
                      {s.average}%
                    </span>{" "}
                    over {s.attempts.length} {s.attempts.length === 1 ? "sitting" : "sittings"}
                  </p>
                </div>
                <ScoreBars className="mt-2" passMark={PASS_MARK} scores={[...s.attempts].sort((a, b) => b.daysAgo - a.daysAgo).map((a) => a.score)} />
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title="Where they're weakest" description="Lowest average first.">
            <ul className="space-y-3">
              {weakest.map((s) => (
                <li key={s.id} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{subjectCode(s.id)}</span>
                    <span className="block truncate text-xs text-muted-foreground">{subjectName(s.id)}</span>
                  </span>
                  <span className="shrink-0 text-sm text-muted-foreground" data-tabular>
                    {s.average}%
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex items-start gap-1.5 text-xs text-muted-foreground">
              <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
              Students see the same breakdown, down to the topic.
            </p>
          </Panel>

          <Panel title="Recent exams">
            <ul className="divide-y divide-border">
              {summary.attempts.slice(0, 8).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{subjectCode(a.subjectId)}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.daysAgo === 0 ? "Today" : `${a.daysAgo} days ago`} · {a.correctAnswers}/{a.totalQuestions}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${a.passed ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"}`}
                    data-tabular
                  >
                    {a.score}%
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  )
}
