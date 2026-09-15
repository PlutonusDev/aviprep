import type React from "react"
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Crosshair,
  Flag,
  Flame,
  Layers,
  MessagesSquare,
  PlayCircle,
  Target,
  X,
} from "lucide-react"
import { cn } from "@lib/utils"

/*
 * Product previews for the landing page, drawn with the same tokens and
 * components as the real dashboard so what visitors see is what they get.
 * Decorative: hidden from assistive tech, with the surrounding copy carrying
 * the meaning.
 */

export function Frame({ path, children, className }: { path: string; children: React.ReactNode; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("overflow-hidden rounded-xl border border-border bg-card shadow-e3", className)}>
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
        </span>
        <span className="ml-2 truncate w-full rounded bg-background/70 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
          aviprep.com.au{path}
        </span>
      </div>
      <div className="select-none">{children}</div>
    </div>
  )
}

export function LessonMock() {
  return (
    <Frame path="/dashboard/learn/cpl-met/lesson/tropopause">
      <div className="grid sm:grid-cols-[10rem_1fr]">
        <div className="hidden border-r border-border bg-muted/20 p-3 sm:block">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Atmosphere</p>
          {["Composition", "Pressure & density", "The tropopause", "Lapse rates"].map((l, i) => (
            <p
              key={l}
              className={cn(
                "flex items-center gap-1.5 rounded px-2 py-1.5 text-xs",
                i === 2 ? "bg-primary/10 font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {i < 2 ? <Check className="h-3 w-3 text-success" /> : <span className="h-3 w-3 rounded-full border border-border" />}
              {l}
            </p>
          ))}
        </div>
        <div className="space-y-3 p-5">
          <p className="text-xs font-medium text-primary">Lesson 3 of 12 · 6 min</p>
          <p className="font-heading text-lg font-bold text-foreground">The tropopause</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The boundary between the troposphere and stratosphere, where temperature stops falling with height. Over
            Australia it usually sits between 36,000 and 40,000 ft.
          </p>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold text-foreground">Flashcard</p>
            <p className="mt-1 text-sm text-muted-foreground">Why is the tropopause higher over the equator?</p>
          </div>
          <div className="h-1.5 rounded-full bg-muted">
            <div className="h-full w-1/4 rounded-full bg-primary" />
          </div>
        </div>
      </div>
    </Frame>
  )
}

export function ExamMock() {
  const options = ["Aerodynamic twisting moment", "Centrifugal twisting moment", "Governor spring tension", "Engine torque"]
  return (
    <Frame path="/dashboard/exams/cpl-agk">
      <div className="flex items-center justify-between border-b border-border px-5 py-2.5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">CPL Aircraft General Knowledge</span>
        <span data-tabular>11 of 20</span>
      </div>
      <div className="h-1 bg-muted">
        <div className="h-full w-[55%] bg-primary" />
      </div>
      <div className="space-y-4 p-5">
        <p className="text-xs text-muted-foreground">Question 11 · Propellers</p>
        <p className="font-medium leading-snug text-foreground">
          On loss of oil pressure in a constant speed unit, which force moves the blades towards fine pitch?
        </p>
        <div className="space-y-2">
          {options.map((o, i) => (
            <div
              key={o}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 text-sm",
                i === 1 ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold",
                  i === 1 ? "border-primary bg-primary text-primary-foreground" : "border-border",
                )}
              >
                {"ABCD"[i]}
              </span>
              {o}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Flag className="h-3.5 w-3.5" /> Flag
          </span>
          <span className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground">Next question</span>
        </div>
      </div>
    </Frame>
  )
}

export function InsightsMock() {
  const topics = [
    { name: "Weight & balance", subject: "CPL Performance", pct: 58 },
    { name: "Radio navigation errors", subject: "CPL Navigation", pct: 64 },
    { name: "Microbursts", subject: "CPL Meteorology", pct: 69 },
  ]
  return (
    <Frame path="/dashboard/insights">
      <div className="space-y-4 p-5">
        <div className="flex items-start gap-3 rounded-lg border border-border p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning/10">
            <Crosshair className="h-4 w-4 text-warning" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Focus here</p>
            <p className="font-semibold text-foreground">CPL Performance</p>
            <p className="text-xs text-muted-foreground">Averaging 61%, 9% below the pass mark.</p>
          </div>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Topics to revisit</p>
        {topics.map((t) => (
          <div key={t.name} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.subject}</p>
            </div>
            <div className="relative h-1.5 w-24 rounded-full bg-muted">
              <div className="h-full rounded-full" style={{ width: `${t.pct}%`, background: "var(--chart-mark)" }} />
              <span className="absolute -top-1 h-3.5 w-0.5 rounded-full bg-foreground/60" style={{ left: "70%" }} />
            </div>
            <span className="w-9 text-right text-sm font-semibold text-foreground" data-tabular>
              {t.pct}%
            </span>
          </div>
        ))}
      </div>
    </Frame>
  )
}

export function ReviewMock() {
  return (
    <Frame path="/dashboard/history/review">
      <div className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Question 4 · Atmosphere</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
            <X className="h-3 w-3" /> Incorrect
          </span>
        </div>
        <p className="font-medium text-foreground">Over Australia, the tropopause typically lies between:</p>
        <div className="flex items-center gap-3 rounded-lg border border-destructive bg-destructive/10 p-2.5 text-sm">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-destructive text-destructive-foreground">
            <X className="h-3 w-3" />
          </span>
          <span className="flex-1 text-foreground">20,000 - 25,000 ft</span>
          <span className="text-xs font-medium text-destructive">Your answer</span>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-success bg-success/10 p-2.5 text-sm">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-success text-success-foreground">
            <Check className="h-3 w-3" />
          </span>
          <span className="flex-1 text-foreground">36,000 - 40,000 ft</span>
          <span className="text-xs font-medium text-success">Correct answer</span>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Explanation</p>
          <p className="mt-1 text-sm text-foreground">
            The tropopause marks where the temperature lapse rate stops. It&apos;s higher in warmer latitudes.
          </p>
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">Part 61 MOS · Unit 1.8.2 · 2.1.3(b)</p>
        </div>
      </div>
    </Frame>
  )
}

export function ProgressMock() {
  return (
    <Frame path="/dashboard">
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Flame, label: "Streak", value: "12 days" },
            { icon: Target, label: "Average", value: "84%" },
            { icon: ClipboardList, label: "Exams", value: "37" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border p-2.5">
              <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <s.icon className="h-3 w-3" /> {s.label}
              </p>
              <p className="mt-1 font-semibold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 p-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Pick up where you left off</p>
            <p className="truncate text-sm font-semibold text-foreground">Density altitude</p>
            <div className="mt-2 h-1 rounded-full bg-muted">
              <div className="h-full w-2/3 rounded-full bg-primary" />
            </div>
          </div>
          <span className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground">
            <PlayCircle className="h-3.5 w-3.5" /> Resume
          </span>
        </div>
        <div className="flex items-end gap-1.5 pt-1" style={{ height: 56 }}>
          {[48, 55, 61, 58, 70, 76, 84].map((h, i) => (
            <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: "var(--chart-mark)", opacity: 0.35 + i * 0.09 }} />
          ))}
        </div>
      </div>
    </Frame>
  )
}

/** Small floating chips that sit around the hero collage. */
export function Chip({
  icon: Icon,
  children,
  className,
  delay = 0,
  drift = 7,
}: {
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  className?: string
  /** Seconds before the float/glow loop starts, so chips don't move in sync. */
  delay?: number
  /** Length of one drift loop, in seconds. */
  drift?: number
}) {
  return (
    <div
      aria-hidden="true"
      style={{ "--chip-delay": `${delay}s`, "--chip-drift": `${drift}s`, "--chip-glow": `${drift * 0.65}s` } as React.CSSProperties}
      className={cn(
        "chip-float flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 text-primary" />
      {children}
    </div>
  )
}

export const MockIcons = { BookOpen, CheckCircle2, ChevronRight, Layers, MessagesSquare }
