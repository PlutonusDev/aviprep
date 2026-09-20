import { step, type Walk } from "../components/components/demo/live"
import { PRESENCE, openingRoster, seeded } from "../lib/demo/presence"
import { DEMO_STUDENTS } from "../lib/demo/school"

const opening = openingRoster(DEMO_STUDENTS)
const random = seeded(31337)
let walk: Walk = { presence: Object.fromEntries(DEMO_STUDENTS.map((s, i) => [s.id, opening[i]])), changed: new Set(), feed: [] }
const live = DEMO_STUDENTS.filter((s) => s.lastSeenDays <= 3).length

// Sampled every 10 minutes of wall-clock demo time.
for (const label of ["start", "5 min", "15 min", "30 min", "60 min"]) {
  const active = Object.values(walk.presence).filter((k) => PRESENCE[k].active).length
  console.log(`${label.padEnd(7)} ${active}/${DEMO_STUDENTS.length} active  (${live} could be)`)
  for (let t = 0; t < 160; t++) walk = step(walk, random, Date.now() + t)
}
