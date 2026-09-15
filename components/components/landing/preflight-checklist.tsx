"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Check } from "lucide-react"
import { cn } from "@lib/utils"
import { ExamMock, InsightsMock, LessonMock, ProgressMock, ReviewMock } from "./mockups"

interface Step {
  id: string
  label: string
  title: string
  body: string
  points: string[]
  mock: React.ReactNode
}

const STEPS: Step[] = [
  {
    id: "learn",
    label: "Learn",
    title: "Structured lessons for every subject",
    body: "Courses mapped to the Part 61 Manual of Standards, from RPL basics through CPL and ATPL. Short lessons, flashcards and quizzes, so the theory actually sticks.",
    points: ["RPL, PPL, CPL and ATPL subjects", "Flashcards and quizzes built in", "Pick up exactly where you left off"],
    mock: <LessonMock />,
  },
  {
    id: "practise",
    label: "Practise",
    title: "Exams that feel like the real sitting",
    body: "A focused, distraction-free exam screen modelled on the PEXO environment. Answers stay hidden until you submit, just like exam day.",
    points: ["Unseen and last-missed questions first", "Question and answer order shuffled", "Flag, review and keyboard shortcuts"],
    mock: <ExamMock />,
  },
  {
    id: "diagnose",
    label: "Diagnose",
    title: "Know exactly where marks slip",
    body: "Insights flag the subject you're working on when it's below the pass mark or trailing the rest, then name the topics dragging it down.",
    points: ["Focus area only when there's a real gap", "Topic accuracy against the 70% pass mark", "No noise when you're on track"],
    mock: <InsightsMock />,
  },
  {
    id: "review",
    label: "Review",
    title: "Learn from every answer",
    body: "Go back through any past exam. See what you picked, the right answer, a clear explanation and the Manual of Standards reference behind it.",
    points: ["Full review of every past attempt", "Explanations with MOS citations", "Filter to incorrect, skipped or flagged"],
    mock: <ReviewMock />,
  },
  {
    id: "track",
    label: "Stay on track",
    title: "Momentum you can see",
    body: "Streaks, score trends and a dashboard that takes you straight back to your next lesson. On your laptop, or installed on your phone.",
    points: ["Score trends and study time", "Installable app for iPhone and Android", "Forums and messages with other students"],
    mock: <ProgressMock />,
  },
]

/**
 * Scroll-driven walkthrough. On large screens the checklist sticks while each
 * step scrolls past, ticking items off and swapping the product preview. On
 * small screens each step simply stacks with its own preview.
 */
export function PreflightChecklist() {
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index))
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    )
    refs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="grid gap-10 lg:grid-cols-[18rem_1fr] lg:gap-16">
      {/* The checklist */}
      <div className="hidden lg:block">
        <div className="sticky top-28 rounded-xl border border-border bg-card p-5 shadow-e1">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Pre-flight checklist
          </p>
          <ol className="mt-4 space-y-1">
            {STEPS.map((s, i) => {
              const done = i < active
              const current = i === active
              return (
                <li key={s.id}>
                  <a
                    href={`#step-${s.id}`}
                    aria-current={current ? "step" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      current ? "bg-primary/10 font-semibold text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold transition-colors",
                        done && "border-success bg-success text-success-foreground",
                        current && "border-primary text-primary",
                        !done && !current && "border-border",
                      )}
                    >
                      {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
                    </span>
                    <span className="flex-1">{s.label}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{done ? "CHECK" : current ? "····" : ""}</span>
                  </a>
                </li>
              )
            })}
          </ol>
          <div className="mt-4 h-1 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${((active + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* The steps */}
      <div className="space-y-20 lg:space-y-32">
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            id={`step-${s.id}`}
            data-index={i}
            ref={(el) => {
              refs.current[i] = el
            }}
            className="grid scroll-mt-28 items-center gap-8 xl:grid-cols-2"
          >
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                {String(i + 1).padStart(2, "0")} · {s.label}
              </p>
              <h3 className="mt-3 font-heading text-2xl font-bold leading-tight text-foreground text-balance sm:text-3xl">
                {s.title}
              </h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">{s.body}</p>
              <ul className="mt-5 space-y-2">
                {s.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-foreground">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15">
                      <Check className="h-2.5 w-2.5 text-primary" aria-hidden="true" />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className={cn("transition-opacity duration-500 motion-reduce:transition-none lg:opacity-40", i === active && "lg:opacity-100")}>
              {s.mock}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
