"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { X, ArrowLeft, ArrowRight } from "lucide-react"
import Link from "next/link"
import { resolveSteps, type TourStep } from "./tour-steps"

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

const PADDING = 8
const CARD_WIDTH = 340
const GAP = 12

function targetRect(key: string): Rect | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${key}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return null
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

/**
 * A guided tour over the real interface.
 *
 * Steps point at elements by `data-tour` attribute. Anything missing - a nav
 * item the school disabled, a card that only appears once there is data - is
 * dropped rather than spotlighting empty space, so the tour never talks about
 * something the reader cannot see.
 */
export function Tour({
  steps,
  disabledFeatures,
  onClose,
}: {
  steps: TourStep[]
  disabledFeatures: string[]
  onClose: () => void
}) {
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [mounted, setMounted] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches

  // Fade the whole thing in once, rather than snapping over the page.
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Resolve once on mount: the DOM is what decides which steps are real.
  const resolved = useMemo(
    () =>
      resolveSteps(steps, {
        disabledFeatures,
        hasTarget: (key) => targetRect(key) !== null,
      }),
    [steps, disabledFeatures],
  )

  const step = resolved[index]
  const isLast = index === resolved.length - 1

  const measure = useCallback(() => {
    setRect(step?.target ? targetRect(step.target) : null)
  }, [step])

  useLayoutEffect(() => {
    if (!step?.target) {
      setRect(null)
      return
    }

    // Bring the target into view before measuring, or a step pointing at
    // something below the fold would spotlight an off-screen rectangle.
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
    const r = el?.getBoundingClientRect()
    const offscreen = r && (r.top < 80 || r.bottom > window.innerHeight - 80)

    if (el && offscreen) {
      el.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" })
      // Re-measure after the scroll settles.
      const id = window.setTimeout(measure, reduceMotion ? 0 : 340)
      return () => window.clearTimeout(id)
    }

    measure()
  }, [step, measure, reduceMotion])

  useEffect(() => {
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", measure, true)
    return () => {
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", measure, true)
    }
  }, [measure])

  // Move focus to the card each step so a screen reader follows the narration.
  useEffect(() => {
    cardRef.current?.focus()
  }, [index])

  const next = useCallback(() => {
    if (isLast) onClose()
    else setIndex((i) => i + 1)
  }, [isLast, onClose])

  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowRight") next()
      if (e.key === "ArrowLeft") back()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [next, back, onClose])

  // Deliberately no scroll lock: the spotlight re-measures on scroll, and
  // locking the body would stop scrollIntoView reaching a target below the fold.

  if (!step) return null

  // Card position: beside the target when there is one, centred otherwise.
  // Narrow screens always get the centred treatment - there is no room beside
  // anything, and a card wedged against the edge reads as broken.
  const narrow = typeof window !== "undefined" && window.innerWidth < 640

  const cardStyle: React.CSSProperties = (() => {
    if (!rect || narrow) {
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
    }
    const spaceRight = window.innerWidth - (rect.left + rect.width)
    const left =
      spaceRight > CARD_WIDTH + GAP * 2
        ? rect.left + rect.width + GAP
        : Math.max(GAP, rect.left - CARD_WIDTH - GAP)
    const top = Math.min(
      Math.max(GAP, rect.top),
      Math.max(GAP, window.innerHeight - 280),
    )
    return { top, left }
  })()

  const motionStyle: React.CSSProperties = reduceMotion
    ? {}
    : {
        transition:
          "top 320ms cubic-bezier(0.2,0,0,1), left 320ms cubic-bezier(0.2,0,0,1), opacity 200ms ease-out",
      }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      className="fixed inset-0 z-[200]"
      style={{ opacity: mounted ? 1 : 0, transition: reduceMotion ? "none" : "opacity 180ms ease-out" }}
    >
      {/* Click anywhere off the card to leave. Transparent: the dimming is done
          entirely by the cutout below, so the highlighted element stays bright. */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {rect ? (
        /* One dim layer only. The huge spread shadow darkens everything outside
           this box, which is what makes the target read as lit rather than
           merely outlined - a second full-screen overlay would mute it again. */
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-xl ring-2 ring-primary/80"
          style={{
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
            boxShadow: "0 0 0 9999px rgba(2, 6, 23, 0.72)",
            transition: reduceMotion
              ? "none"
              : "top 320ms cubic-bezier(0.2,0,0,1), left 320ms cubic-bezier(0.2,0,0,1), width 320ms cubic-bezier(0.2,0,0,1), height 320ms cubic-bezier(0.2,0,0,1)",
          }}
        />
      ) : (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ backgroundColor: "rgba(2, 6, 23, 0.72)" }}
        />
      )}

      <div
        ref={cardRef}
        tabIndex={-1}
        style={{ width: CARD_WIDTH, position: "absolute", ...cardStyle, ...motionStyle }}
        className="max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card p-5 shadow-e4 outline-none"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <p className="text-xs font-medium text-muted-foreground" data-tabular>
            Step {index + 1} of {resolved.length}
          </p>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close the tour"
            className="-mr-2 -mt-2 h-8 w-8 shrink-0"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <h2 id="tour-title" className="text-lg font-semibold text-foreground">
          {step.title}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>

        {/* Progress reads as position, not decoration. */}
        <ol className="mt-4 flex gap-1" aria-hidden="true">
          {resolved.map((s, i) => (
            <li
              key={s.id}
              className={`h-1 flex-1 rounded-full ${i <= index ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </ol>

        <div className="mt-4 flex items-center gap-2">
          {index > 0 && (
            <Button variant="ghost" size="sm" onClick={back} className="h-9 gap-1">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </Button>
          )}

          {step.action && (
            <Button asChild variant="outline" size="sm" className="h-9" onClick={onClose}>
              <Link href={step.action.href}>{step.action.label}</Link>
            </Button>
          )}

          <Button size="sm" onClick={next} className="ml-auto h-9 gap-1">
            {isLast ? "Finish" : "Next"}
            {!isLast && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
