"use client"

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react"
import {
  PRESENCE,
  PRESENCE_ORDER,
  countByPresence,
  nextPresence,
  openingRoster,
  seeded,
  type PresenceKey,
} from "@lib/demo/presence"
import { DEMO_STUDENTS, attemptsFor, subjectCode } from "@lib/demo/school"

/**
 * What makes the demo feel like something that's running.
 *
 * Every student has a presence state that walks between Online, In a course,
 * Sitting an exam and so on. The first frame is fixed so the server and the
 * browser agree; the walk starts after mount. Finishing an exam drops a line
 * into the activity feed.
 */

const TICK_MS = 3800
const REDUCED_TICK_MS = 12000

export interface FeedEntry {
  id: string
  studentId: string
  name: string
  kind: "finished" | "started" | "joined"
  detail: string
  score?: number
  passed?: boolean
  at: number
}

interface LiveState {
  presence: Record<string, PresenceKey>
  /** Students whose state changed on the last tick, for a one-off highlight. */
  changed: Set<string>
  feed: FeedEntry[]
  counts: Record<PresenceKey, number>
  activeNow: number
  /** Ticks since mount. Zero means the server's frame is still on screen. */
  tick: number
}

const OPENING = openingRoster(DEMO_STUDENTS)
const OPENING_MAP = Object.fromEntries(DEMO_STUDENTS.map((s, i) => [s.id, OPENING[i]])) as Record<string, PresenceKey>

/** The feed the server renders, before anything live has happened. */
function openingFeed(): FeedEntry[] {
  return DEMO_STUDENTS.flatMap((student) =>
    attemptsFor(student.id)
      .slice(0, 1)
      .map((a) => ({
        id: `seed-${a.id}`,
        studentId: student.id,
        name: `${student.firstName} ${student.lastName}`,
        kind: "finished" as const,
        detail: subjectCode(a.subjectId),
        score: a.score,
        passed: a.passed,
        at: -a.daysAgo * 86_400_000,
      })),
  )
    .sort((a, b) => b.at - a.at)
    .slice(0, 8)
}

export interface Walk {
  presence: Record<string, PresenceKey>
  changed: Set<string>
  feed: FeedEntry[]
}

export const FEED_MAX = 8
/** Students the opening frame put offline, who stay there. */
const STALE = new Set(DEMO_STUDENTS.filter((s) => s.lastSeenDays > 3).map((s) => s.id))
/** How many students can change on one tick. Everyone at once looks fake. */
const MAX_CHANGES = 2

/**
 * One tick, as a pure function of the last one. Pure so a state setter never
 * has to reach out and touch another piece of state while React is mid-update,
 * and so the walk can be tested without a browser.
 */
export function step(state: Walk, random: () => number, now: number): Walk {
  const ids = Object.keys(state.presence)
  const presence = { ...state.presence }
  const changed = new Set<string>()
  const arrivals: FeedEntry[] = []

  const howMany = 1 + Math.floor(random() * MAX_CHANGES)
  for (let i = 0; i < howMany; i++) {
    const id = ids[Math.floor(random() * ids.length)]
    if (!id) continue
    // Someone who hasn't opened AviPrep in a week doesn't wander online
    // halfway through a demo.
    if (STALE.has(id)) continue
    const from = presence[id]
    // A full-range roll: the stay probabilities in the transition table are
    // what keep this gentle, not a clipped roll.
    const to = nextPresence(from, random(), random())
    if (to === from) continue
    presence[id] = to
    changed.add(id)

    // Coming out of an exam means a result, which is the one thing worth
    // interrupting the feed for.
    if (from !== "exam") continue
    const student = DEMO_STUDENTS.find((s) => s.id === id)
    const attempt = student ? attemptsFor(student.id)[0] : null
    if (!student || !attempt) continue

    const score = Math.max(30, Math.min(99, Math.round(attempt.score + (random() - 0.5) * 14)))
    arrivals.push({
      id: `live-${id}-${now}-${i}`,
      studentId: id,
      name: `${student.firstName} ${student.lastName}`,
      kind: "finished",
      detail: subjectCode(attempt.subjectId),
      score,
      passed: score >= 70,
      at: now,
    })
  }

  return {
    presence,
    changed,
    feed: arrivals.length ? [...arrivals, ...state.feed].slice(0, FEED_MAX) : state.feed,
  }
}

const OPENING_STATE: Walk = { presence: OPENING_MAP, changed: new Set(), feed: [] }

const LiveContext = createContext<LiveState>({
  presence: OPENING_MAP,
  changed: new Set(),
  feed: [],
  counts: countByPresence(OPENING),
  activeNow: OPENING.filter((k) => PRESENCE[k].active).length,
  tick: 0,
})

export const useLive = () => useContext(LiveContext)

export function LiveProvider({ children }: { children: React.ReactNode }) {
  const [walk, setWalk] = useState<Walk>(() => ({ ...OPENING_STATE, feed: openingFeed() }))
  const [tick, setTick] = useState(0)
  const random = useRef(seeded(20260920))

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
    const interval = window.setInterval(
      () => {
        setWalk((current) => step(current, random.current, Date.now()))
        setTick((t) => t + 1)
      },
      reduced ? REDUCED_TICK_MS : TICK_MS,
    )
    return () => window.clearInterval(interval)
  }, [])

  const value = useMemo<LiveState>(() => {
    const keys = DEMO_STUDENTS.map((s) => walk.presence[s.id])
    return {
      presence: walk.presence,
      changed: walk.changed,
      feed: walk.feed,
      counts: countByPresence(keys),
      activeNow: keys.filter((k) => PRESENCE[k].active).length,
      tick,
    }
  }, [walk, tick])

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>
}

/* --- Pieces that read it ------------------------------------------------------ */

export function StatusDot({ state, className = "" }: { state: PresenceKey; className?: string }) {
  const def = PRESENCE[state]
  return (
    <span className={`relative flex h-2 w-2 shrink-0 ${className}`} aria-hidden="true">
      {def.active && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${def.dot} motion-reduce:hidden`} />}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${def.dot}`} />
    </span>
  )
}

export function StatusPill({ studentId, className = "" }: { studentId: string; className?: string }) {
  const { presence } = useLive()
  const state = presence[studentId] ?? "offline"
  const def = PRESENCE[state]
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs ${def.tone} ${className}`}>
      <StatusDot state={state} />
      {def.label}
    </span>
  )
}

/** The legend, and the live count, for the top of a list. */
export function PresenceSummary({ className = "" }: { className?: string }) {
  const { counts } = useLive()
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 ${className}`}>
      {PRESENCE_ORDER.filter((k) => counts[k] > 0).map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <StatusDot state={k} />
          <span className="tabular-nums font-medium text-foreground">{counts[k]}</span>
          {PRESENCE[k].label}
        </span>
      ))}
    </div>
  )
}
