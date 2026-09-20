import { CheckCircle2 } from "lucide-react"
import { PageHead, Panel } from "@/components/demo/bits"
import { DEMO_SEATS, subjectCode, subjectName } from "@lib/demo/school"

/** Seats bought per subject, and how many are out. */
export default function DemoSeats() {
  const total = DEMO_SEATS.reduce((n, s) => n + s.total, 0)
  const used = DEMO_SEATS.reduce((n, s) => n + s.used, 0)

  return (
    <div className="mx-auto max-w-4xl">
      <PageHead title="Seats & subjects" blurb={`${used} of ${total} in use`} />

      <div className="space-y-6">
        <Panel>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-semibold text-foreground" data-tabular>
                {used} <span className="text-lg font-normal text-muted-foreground">of {total} seats out</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Across {DEMO_SEATS.length} subjects</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">Buy more seats</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(used / total) * 100}%` }} />
          </div>
        </Panel>

        <Panel title="By subject">
          <ul className="divide-y divide-border">
            {DEMO_SEATS.map((seat) => {
              const pct = Math.round((seat.used / seat.total) * 100)
              return (
                <li key={seat.subjectId} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        <span className="font-mono text-xs text-muted-foreground">{subjectCode(seat.subjectId)}</span> {subjectName(seat.subjectId)}
                      </p>
                      <p className="text-xs text-muted-foreground">Renews in {seat.expiresInMonths} months</p>
                    </div>
                    <p className="shrink-0 text-sm text-muted-foreground" data-tabular>
                      <span className="font-semibold text-foreground">{seat.used}</span> / {seat.total}
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: pct > 85 ? "var(--warning)" : "var(--primary)" }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </Panel>

        <Panel title="A seat covers">
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {[
              "The question bank for that subject",
              "Practice exams, timed and marked",
              "Lessons, flash cards and quizzes",
              "Results and weak topics",
            ].map((item) => (
              <li key={item} className="flex gap-2.5 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
