import type React from "react"
import { cn } from "@lib/utils"

/** The small pieces every demo page is built from. */

export function PageHead({ title, blurb, aside }: { title: string; blurb: string; aside?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{blurb}</p>
      </div>
      {aside}
    </header>
  )
}

export function Stat({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ComponentType<{ className?: string }>
  tone?: "warn" | "good"
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-e1">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            tone === "warn" ? "bg-warning/15" : tone === "good" ? "bg-success/15" : "bg-primary/10",
          )}
        >
          <Icon className={cn("h-4 w-4", tone === "warn" ? "text-warning" : tone === "good" ? "text-success" : "text-primary")} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xl font-semibold text-foreground" data-tabular>
            {value}
          </p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string
  description?: string
  /** Right-aligned link or control in the panel header. */
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card", className)}>
      {(title || description || action) && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border px-5 py-3.5">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}

/** Bars against the pass mark, used for one subject or one student. */
export function ScoreBars({ scores, passMark = 70, className }: { scores: number[]; passMark?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("relative h-16", className)}>
      <div className="absolute inset-x-0 z-10 flex items-center" style={{ bottom: `${passMark}%` }}>
        <span className="h-px flex-1 border-t border-dashed border-foreground/30" />
      </div>
      <div className="flex h-full items-end gap-1">
        {scores.map((score, i) => (
          <div
            key={i}
            title={`${score}%`}
            className={cn("min-w-[3px] flex-1 rounded-t-[2px]", score >= passMark ? "bg-success" : "bg-destructive/60")}
            style={{ height: `${Math.max(score, 2)}%` }}
          />
        ))}
      </div>
    </div>
  )
}

export function Initials({ first, last, className }: { first: string; last: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-foreground", className)}
    >
      {first[0]}
      {last[0]}
    </span>
  )
}
