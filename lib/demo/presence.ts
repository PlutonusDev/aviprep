/**
 * What each student is doing right now, for the demo portal.
 *
 * Pure and deterministic: the first value for a student is derived from their
 * seed so the server and the browser agree, and the portal then walks them
 * between states on a timer. Transitions are restricted to ones that make sense
 * - nobody goes from offline straight into an exam.
 */

export type PresenceKey = "exam" | "course" | "forum" | "online" | "idle" | "offline"

export interface PresenceDef {
  key: PresenceKey
  label: string
  /** Tailwind colour token for the dot and text. */
  tone: string
  dot: string
  /** Counts towards "active now". */
  active: boolean
}

export const PRESENCE: Record<PresenceKey, PresenceDef> = {
  exam: { key: "exam", label: "Sitting an exam", tone: "text-primary", dot: "bg-primary", active: true },
  course: { key: "course", label: "In a course", tone: "text-success", dot: "bg-success", active: true },
  forum: { key: "forum", label: "In the forums", tone: "text-[var(--chart-2)]", dot: "bg-[var(--chart-2)]", active: true },
  online: { key: "online", label: "Online", tone: "text-success", dot: "bg-success", active: true },
  idle: { key: "idle", label: "Idle", tone: "text-warning", dot: "bg-warning", active: false },
  offline: { key: "offline", label: "Offline", tone: "text-muted-foreground", dot: "bg-muted-foreground/40", active: false },
}

export const PRESENCE_ORDER: PresenceKey[] = ["exam", "course", "forum", "online", "idle", "offline"]

/** Where each state can go next, with how likely it is to stay put. */
const TRANSITIONS: Record<PresenceKey, { stay: number; next: PresenceKey[] }> = {
  exam: { stay: 0.82, next: ["online", "online", "course"] },
  course: { stay: 0.78, next: ["online", "exam", "forum", "idle"] },
  forum: { stay: 0.7, next: ["online", "course", "idle"] },
  online: { stay: 0.55, next: ["course", "exam", "forum", "idle", "course"] },
  idle: { stay: 0.72, next: ["online", "online", "course", "offline"] },
  // Deliberately not sticky: students who are genuinely gone are held offline
  // by the roster instead (see STALE), so this one only covers people who
  // stepped away and will come back.
  offline: { stay: 0.55, next: ["online", "online", "idle"] },
}

/** A small LCG, so a given seed always gives the same walk. */
export function seeded(seed: number) {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

/**
 * The frame the portal opens on.
 *
 * Deliberate rather than random: a demo should open on something worth looking
 * at, so somebody is always mid-exam when the page loads. Students who haven't
 * been near AviPrep in days are offline regardless, and the walk takes over
 * from the second tick.
 */
const OPENING: PresenceKey[] = ["exam", "course", "online", "forum", "course", "online", "idle", "course", "exam", "online", "forum", "idle", "online"]

/** Anyone quieter than this is offline whatever the opening frame says. */
const RECENT_DAYS = 3

export function startingPresence(index: number, lastSeenDays: number, seat: number): PresenceKey {
  if (lastSeenDays > RECENT_DAYS) return "offline"
  return OPENING[seat % OPENING.length]
}

/** Assigns the opening frame across a roster, in order. */
export function openingRoster(students: { lastSeenDays: number }[]): PresenceKey[] {
  let seat = 0
  return students.map((student, i) => {
    if (student.lastSeenDays > RECENT_DAYS) return "offline"
    return startingPresence(i, student.lastSeenDays, seat++)
  })
}

/** One step of the walk. */
export function nextPresence(current: PresenceKey, roll: number, pick: number): PresenceKey {
  const rule = TRANSITIONS[current]
  if (roll < rule.stay) return current
  return rule.next[Math.floor(pick * rule.next.length)] ?? current
}

export const isActive = (key: PresenceKey) => PRESENCE[key].active

export function countByPresence(keys: PresenceKey[]) {
  const counts = {} as Record<PresenceKey, number>
  for (const k of PRESENCE_ORDER) counts[k] = 0
  for (const k of keys) counts[k] += 1
  return counts
}
