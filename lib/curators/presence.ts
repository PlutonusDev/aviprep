/**
 * Who's in the studio right now, and what they're on.
 *
 * The studio sends a heartbeat every minute while a curator has it open, so the
 * admin roster can say "online, writing a question" instead of "has an account".
 * Pure: no Prisma, no server-only, so it's shared by the API and the UI.
 */

/** How long after the last heartbeat we still call someone online. */
const ONLINE_MS = 3 * 60_000
/** After this they've wandered off, but the tab is probably still open. */
const IDLE_MS = 30 * 60_000

export type Presence = "online" | "idle" | "offline" | "off"

export type ActivityKind =
  | "question"
  | "course"
  | "lesson"
  | "mos"
  | "review"
  | "earnings"
  | "account"
  | "home"

export interface Activity {
  kind: ActivityKind
  label: string
}

export interface PresenceInput {
  isActive: boolean
  lastSeenAt: Date | string | null
  activityKind?: string | null
  activityLabel?: string | null
}

const time = (value: Date | string | null | undefined) => {
  if (!value) return null
  const ms = value instanceof Date ? value.getTime() : Date.parse(value)
  return Number.isNaN(ms) ? null : ms
}

/** Presence from the last heartbeat. A switched-off account is always "off". */
export function presenceOf(curator: PresenceInput, now: number = Date.now()): Presence {
  if (!curator.isActive) return "off"
  const seen = time(curator.lastSeenAt)
  if (seen === null) return "offline"
  const since = now - seen
  if (since < ONLINE_MS) return "online"
  if (since < IDLE_MS) return "idle"
  return "offline"
}

/**
 * What to show beside their name. Only someone online or idle is "working on"
 * something; once they're offline the stored activity is just history.
 */
export function statusLine(curator: PresenceInput, now: number = Date.now()): { presence: Presence; label: string } {
  const presence = presenceOf(curator, now)
  if (presence === "off") return { presence, label: "Switched off" }
  if (presence === "offline") return { presence, label: "Offline" }
  const doing = curator.activityLabel?.trim()
  if (presence === "idle") return { presence, label: doing ? `Idle · ${doing}` : "Idle" }
  return { presence, label: doing || "In the studio" }
}

/* --- Turning a studio URL into something readable ------------------------- */

const SECTION: { match: RegExp; kind: ActivityKind; label: string }[] = [
  { match: /^\/admin\/questions(\/|$)/, kind: "question", label: "Writing a question" },
  { match: /^\/admin\/courses\/[^/]+\/lesson(\/|$)/, kind: "lesson", label: "Writing a lesson" },
  { match: /^\/admin\/courses(\/|$)/, kind: "course", label: "Working on a course" },
  { match: /^\/admin\/mos(\/|$)/, kind: "mos", label: "In MOS coverage" },
  { match: /^\/admin\/review(\/|$)/, kind: "review", label: "In review" },
  { match: /^\/admin\/earnings(\/|$)/, kind: "earnings", label: "On their earnings" },
  { match: /^\/admin\/account(\/|$)/, kind: "account", label: "In their account" },
]

/** Trimmed so one long subject name can't fill the roster row. */
const tidy = (value: string, max = 70) => {
  const clean = value.replace(/\s+/g, " ").trim()
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

/**
 * `detail` is what the page knows and the URL doesn't, e.g. the subject and
 * whether the question is new. Anything unrecognised reads as the studio home.
 */
export function describeActivity(path: string, detail?: string | null): Activity {
  const section = SECTION.find((s) => s.match.test(path))
  const kind = section?.kind ?? "home"
  const base = section?.label ?? "In the studio"
  const extra = typeof detail === "string" ? detail.replace(/\s+/g, " ").trim().slice(0, 80) : ""
  return { kind, label: tidy(extra ? `${base} · ${extra}` : base) }
}
