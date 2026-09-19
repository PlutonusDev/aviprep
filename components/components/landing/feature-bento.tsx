"use client"

import type React from "react"
import { motion } from "motion/react"
import { BarChart3, Check, Flag, MessagesSquare, Shuffle, ShieldCheck, Smartphone, Timer, X } from "lucide-react"
import { cn } from "@lib/utils"

/**
 * The feature bento.
 *
 * Six tiles on a 6-column grid, in three rows of 4+2, 2+4 and 3+3. The
 * alternating rhythm is the point: an even grid of six identical cards isn't a
 * bento, it's a table. Every tile carries a small illustration, because a tile
 * with only two lines of text next to one with a chart reads as unfinished.
 */

interface Tile {
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
  /** Explicit Tailwind spans: the JIT compiler needs literal class names. */
  span: string
  /** Text beside the illustration rather than above it. For the widest tiles. */
  split?: boolean
  visual: React.ReactNode
}

/* --- Tiny illustrations (decorative) --------------------------------------- */

function QuestionQueue() {
  const queue = [
    { n: 1, label: "Unseen", tone: "primary" },
    { n: 2, label: "Last wrong", tone: "warning" },
    { n: 3, label: "Unseen", tone: "primary" },
    { n: 4, label: "Last wrong", tone: "warning" },
    { n: 5, label: "Correct", tone: "muted" },
    { n: 6, label: "Unseen", tone: "primary" },
  ] as const

  return (
    <div aria-hidden="true" className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {queue.map((q) => (
          <span
            key={q.n}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
              q.tone === "primary" && "border-primary/30 bg-primary/10 text-foreground",
              q.tone === "warning" && "border-warning/40 bg-warning/10 text-foreground",
              q.tone === "muted" && "border-border bg-muted/60 text-muted-foreground",
            )}
          >
            <span className="font-mono text-[10px] text-muted-foreground">Q{q.n}</span>
            {q.label}
          </span>
        ))}
      </div>
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Shuffle className="h-3 w-3" />
        Order reshuffled every sitting
      </p>
    </div>
  )
}

function ScoreBars() {
  const scores = [52, 58, 55, 64, 71, 68, 77, 82]

  return (
    <div aria-hidden="true" className="space-y-2">
      <div className="relative h-24">
        {/* The pass mark is the only line that matters, so it's the only one drawn. */}
        <div className="absolute inset-x-0 z-10 flex items-center gap-2" style={{ bottom: "70%" }}>
          <span className="h-px flex-1 border-t border-dashed border-foreground/40" />
          <span className="rounded bg-background px-1 text-[10px] font-medium text-muted-foreground">Pass 70%</span>
        </div>
        <div className="flex h-full items-end gap-1.5">
          {scores.map((s, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-[3px] transition-[height] duration-500"
              style={{ height: `${s}%`, background: "var(--chart-mark)", opacity: s >= 70 ? 1 : 0.4 }}
            />
          ))}
        </div>
      </div>
      <div className="flex items-baseline justify-between text-[11px] text-muted-foreground">
        <span>Eight sittings</span>
        <span className="font-medium text-foreground" data-tabular>
          82%
        </span>
      </div>
    </div>
  )
}

function PhoneSketch() {
  return (
    <div aria-hidden="true" className="flex justify-center py-1">
      <div className="flex h-32 w-[4.5rem] flex-col rounded-[16px] border-2 border-border bg-background p-2 shadow-e1">
        <span className="mx-auto mb-1.5 h-1 w-5 rounded-full bg-border" />
        <div className="flex-1 space-y-1.5 rounded-lg bg-muted/60 p-1.5">
          <span className="block h-1.5 w-3/4 rounded-full bg-primary/70" />
          <span className="block h-1 w-full rounded-full bg-border" />
          <span className="block h-1 w-5/6 rounded-full bg-border" />
          <span className="mt-2 block h-4 w-full rounded bg-primary/15" />
          <span className="block h-4 w-full rounded bg-border/60" />
        </div>
        <div className="mt-1.5 flex justify-around">
          {[0, 1, 2].map((i) => (
            <span key={i} className={cn("h-1 w-1 rounded-full", i === 0 ? "bg-primary" : "bg-border")} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ExamSketch() {
  return (
    <div aria-hidden="true" className="space-y-2">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Timer className="h-3 w-3" />
          14 of 20
        </span>
        <span className="inline-flex items-center gap-1 text-primary">
          <Flag className="h-3 w-3 fill-current" />
          Flagged
        </span>
      </div>
      <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-[11px] text-foreground">
        <X className="h-3 w-3 shrink-0 text-destructive" /> What you picked
      </div>
      <div className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-2 py-1.5 text-[11px] text-foreground">
        <Check className="h-3 w-3 shrink-0 text-success" /> Revealed after you submit
      </div>
    </div>
  )
}

function ThreadSketch() {
  const rows = [
    { me: false, w: "w-full" },
    { me: true, w: "w-4/5" },
    { me: false, w: "w-2/3" },
  ]

  return (
    <div aria-hidden="true" className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className={cn("flex items-start gap-2", r.me && "flex-row-reverse")}>
          <div className={cn("h-5 w-5 shrink-0 rounded-full", r.me ? "bg-primary/25" : "bg-muted-foreground/25")} />
          <div className={cn("min-w-0 space-y-1 rounded-lg px-2 py-1.5", r.w, r.me ? "bg-primary/10" : "bg-muted/70")}>
            <div className="h-1 w-full rounded-full bg-foreground/20" />
            <div className="h-1 w-2/3 rounded-full bg-foreground/15" />
          </div>
        </div>
      ))}
    </div>
  )
}

function CodeSketch() {
  return (
    <div aria-hidden="true" className="space-y-2.5">
      <div className="flex gap-1.5">
        {["4", "1", "8", "2", "0", ""].map((d, i) => (
          <span
            key={i}
            className={cn(
              "flex h-9 flex-1 items-center justify-center rounded-md border font-mono text-sm font-semibold",
              d ? "border-border bg-background text-foreground" : "border-primary bg-primary/5 text-primary",
            )}
          >
            {d || <span className="h-4 w-px animate-pulse bg-primary motion-reduce:animate-none" />}
          </span>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">Sent by SMS</p>
    </div>
  )
}

/* --- The tiles --------------------------------------------------------------- */

const TILES: Tile[] = [
  {
    icon: Shuffle,
    title: "No two exams the same",
    body: "Each sitting leads with the questions you haven't seen or last got wrong, then shuffles the order of both the questions and the answers.",
    span: "md:col-span-2 lg:col-span-4",
    split: true,
    visual: <QuestionQueue />,
  },
  {
    icon: Smartphone,
    title: "In your pocket",
    body: "Add it to your home screen. It runs like an app, on iPhone and Android.",
    span: "lg:col-span-2",
    visual: <PhoneSketch />,
  },
  {
    icon: Timer,
    title: "Exam mode",
    body: "Full screen, keyboard shortcuts, flag anything you want to come back to. Nothing is marked until you submit.",
    span: "lg:col-span-2",
    visual: <ExamSketch />,
  },
  {
    icon: BarChart3,
    title: "Scores against the pass mark",
    body: "Every sitting plotted against 70%, with a running average per subject.",
    span: "md:col-span-2 lg:col-span-4",
    split: true,
    visual: <ScoreBars />,
  },
  {
    icon: MessagesSquare,
    title: "Forums and messages",
    body: "Ask other students, or message one directly. The curators who write the questions are in there too.",
    span: "lg:col-span-3",
    visual: <ThreadSketch />,
  },
  {
    icon: ShieldCheck,
    title: "Tied to your mobile",
    body: "A texted code signs you in. Trusted devices skip it for 30 days.",
    span: "lg:col-span-3",
    visual: <CodeSketch />,
  },
]

export function FeatureBento() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
      {TILES.map((t, i) => (
        <motion.article
          key={t.title}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-e1 transition-[border-color,box-shadow] duration-300 hover:border-primary/40 hover:shadow-e2",
            t.span,
          )}
        >
          {/* Soft brand wash that warms up on hover. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none"
            style={{
              background:
                "radial-gradient(28rem 12rem at 0% 0%, color-mix(in oklab, var(--primary) 10%, transparent), transparent 70%)",
            }}
          />

          <div className={cn("relative flex flex-1 gap-6", t.split ? "flex-col sm:flex-row sm:items-center" : "flex-col")}>
            <div className={cn("flex flex-col", t.split && "sm:max-w-[17rem] sm:shrink-0")}>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/15">
                <t.icon className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground">{t.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
            </div>

            {/* Every illustration sits in the same recessed panel, so six
                different sketches still read as one set. */}
            <div
              className={cn(
                "relative flex min-w-0 flex-col justify-center rounded-xl border border-border/70 bg-background/60 p-4",
                t.split ? "flex-1 self-stretch" : "mt-5 flex-1",
              )}
            >
              {t.visual}
            </div>
          </div>
        </motion.article>
      ))}
    </div>
  )
}
