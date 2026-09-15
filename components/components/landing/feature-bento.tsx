"use client"

import type React from "react"
import { motion } from "motion/react"
import { BarChart3, Check, MessagesSquare, Shuffle, ShieldCheck, Smartphone, Timer, X } from "lucide-react"
import { cn } from "@lib/utils"

interface Tile {
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
  /** Wide tiles span two columns and carry a small illustration. */
  wide?: boolean
  visual?: React.ReactNode
}

/* --- Tiny illustrations (decorative) --------------------------------------- */

function QuestionQueue() {
  const queue = [
    { label: "Unseen", tone: "primary" },
    { label: "Last wrong", tone: "warning" },
    { label: "Unseen", tone: "primary" },
    { label: "Last wrong", tone: "warning" },
    { label: "Correct", tone: "muted" },
  ] as const
  return (
    <div aria-hidden="true" className="flex flex-wrap items-center gap-1.5">
      {queue.map((q, i) => (
        <span
          key={i}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
            q.tone === "primary" && "border-primary/30 bg-primary/10 text-foreground",
            q.tone === "warning" && "border-warning/30 bg-warning/10 text-foreground",
            q.tone === "muted" && "border-border bg-muted/50 text-muted-foreground",
          )}
        >
          <span className="font-mono text-muted-foreground">Q{i + 1}</span>
          {q.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1 px-1 text-[11px] text-muted-foreground">
        <Shuffle className="h-3 w-3" /> shuffled
      </span>
    </div>
  )
}

function ScoreBars() {
  const scores = [52, 58, 55, 64, 71, 68, 77, 82]
  return (
    <div aria-hidden="true" className="relative h-24">
      <div className="absolute inset-x-0 flex items-center gap-2" style={{ bottom: "70%" }}>
        <span className="h-px flex-1 border-t border-dashed border-foreground/40" />
        <span className="text-[10px] font-medium text-muted-foreground">Pass 70%</span>
      </div>
      <div className="flex h-full items-end gap-1.5">
        {scores.map((s, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm"
            style={{ height: `${s}%`, background: "var(--chart-mark)", opacity: s >= 70 ? 1 : 0.45 }}
          />
        ))}
      </div>
    </div>
  )
}

function PhoneSketch() {
  return (
    <div aria-hidden="true" className="mx-auto flex h-24 w-14 flex-col rounded-[14px] border-2 border-border bg-background p-1.5">
      <div className="mx-auto mb-1 h-1 w-5 rounded-full bg-border" />
      <div className="flex-1 space-y-1 rounded-md bg-muted/60 p-1">
        <div className="h-1.5 w-3/4 rounded-full bg-primary/60" />
        <div className="h-1 w-full rounded-full bg-border" />
        <div className="h-1 w-5/6 rounded-full bg-border" />
      </div>
      <div className="mt-1 flex justify-around">
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn("h-1 w-1 rounded-full", i === 0 ? "bg-primary" : "bg-border")} />
        ))}
      </div>
    </div>
  )
}

function ReviewPair() {
  return (
    <div aria-hidden="true" className="space-y-1.5">
      <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] text-foreground">
        <X className="h-3 w-3 text-destructive" /> Your answer
      </div>
      <div className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-2 py-1 text-[11px] text-foreground">
        <Check className="h-3 w-3 text-success" /> Correct, shown after submit
      </div>
    </div>
  )
}

const TILES: Tile[] = [
  {
    icon: Shuffle,
    title: "Adaptive question selection",
    body: "Every exam leads with questions you haven't seen or last got wrong, then shuffles question and answer order.",
    wide: true,
    visual: <QuestionQueue />,
  },
  {
    icon: Smartphone,
    title: "On your phone",
    body: "Install AviPrep to your home screen and study anywhere.",
    visual: <PhoneSketch />,
  },
  {
    icon: MessagesSquare,
    title: "Forums and messages",
    body: "Talk theory with other student pilots, or message someone directly.",
  },
  {
    icon: Timer,
    title: "Exam mode",
    body: "Full screen with keyboard shortcuts and flagging. Answers stay hidden until you submit.",
    visual: <ReviewPair />,
  },
  {
    icon: ShieldCheck,
    title: "Secure by default",
    body: "SMS-verified accounts and trusted devices keep your progress yours.",
  },
  {
    icon: BarChart3,
    title: "Statistics that tell the truth",
    body: "Score trends and subject averages measured against the pass mark, not vanity numbers.",
    wide: true,
    visual: <ScoreBars />,
  },
]

/**
 * Six tiles on a 4-column grid: [wide][1][1] / [1][1][wide]. Each row sums to
 * four columns, so there are no gaps; on tablets (2 columns) wide tiles take a
 * full row and the rest pair up, which also leaves no gaps.
 */
export function FeatureBento() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {TILES.map((t, i) => (
        <motion.article
          key={t.title}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-e1 transition-[border-color,box-shadow] duration-300 hover:border-primary/40 hover:shadow-e2",
            t.wide && "md:col-span-2",
          )}
        >
          {/* Soft brand wash that warms up on hover. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none"
            style={{ background: "radial-gradient(28rem 12rem at 0% 0%, color-mix(in oklab, var(--primary) 10%, transparent), transparent 70%)" }}
          />

          <div className={cn("relative flex flex-1 gap-6", t.wide ? "flex-col sm:flex-row sm:items-center" : "flex-col")}>
            <div className={cn("flex flex-col", t.wide && "sm:max-w-[16rem]")}>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/15">
                <t.icon className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground">{t.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
            </div>
            {t.visual && (
              <div className={cn("relative", t.wide ? "min-w-0 flex-1 rounded-xl border border-border bg-background/60 p-4" : "mt-auto")}>
                {t.visual}
              </div>
            )}
          </div>
        </motion.article>
      ))}
    </div>
  )
}
