import { PRESENCE, PRESENCE_ORDER, countByPresence, nextPresence, openingRoster, seeded, type PresenceKey } from "../lib/demo/presence"
import { DEMO_STUDENTS } from "../lib/demo/school"

let bad = 0
const check = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) bad++
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : ` got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`)
}

// Deterministic: the same student always starts the same way.
const first = openingRoster(DEMO_STUDENTS)
const again = openingRoster(DEMO_STUDENTS)
check("stable across calls", first, again)
check("every key is known", first.every((k) => PRESENCE_ORDER.includes(k)), true)
check("stale students are offline", DEMO_STUDENTS.every((s, i) => s.lastSeenDays <= 3 || first[i] === "offline"), true)
check("somebody is mid-exam on load", first.includes("exam"), true)

const counts = countByPresence(first)
console.log("     start:", PRESENCE_ORDER.map((k) => `${PRESENCE[k].label}=${counts[k]}`).join(", "))
check("someone is active at the start", PRESENCE_ORDER.some((k) => PRESENCE[k].active && counts[k] > 0), true)

// The walk stays inside the state machine and actually moves.
const random = seeded(99)
let state: PresenceKey[] = [...first]
const seen = new Set<string>(state)
let moves = 0
for (let tick = 0; tick < 400; tick++) {
  const next = state.map((k) => nextPresence(k, random(), random()))
  moves += next.filter((k, i) => k !== state[i]).length
  next.forEach((k) => seen.add(k))
  state = next
  if (!state.every((k) => PRESENCE_ORDER.includes(k))) { bad++; console.log("FAIL escaped the state machine"); break }
}
check("stays in the state machine", state.every((k) => PRESENCE_ORDER.includes(k)), true)
check("things actually change", moves > 100, true)
check("reaches every state over time", seen.size, PRESENCE_ORDER.length)
console.log(`     ${moves} changes over 400 ticks (${(moves / 400).toFixed(1)} per tick across ${DEMO_STUDENTS.length} students)`)

const end = countByPresence(state)
console.log("     end:  ", PRESENCE_ORDER.map((k) => `${PRESENCE[k].label}=${end[k]}`).join(", "))
console.log(bad ? `\n${bad} FAILED` : "\nall pass")
