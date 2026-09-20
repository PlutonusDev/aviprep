import { FEED_MAX, step, type Walk } from "../components/components/demo/live"
import { PRESENCE, PRESENCE_ORDER, openingRoster, seeded } from "../lib/demo/presence"
import { DEMO_STUDENTS } from "../lib/demo/school"

let bad = 0
const check = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) bad++
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : ` got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`)
}

const opening = openingRoster(DEMO_STUDENTS)
const start: Walk = {
  presence: Object.fromEntries(DEMO_STUDENTS.map((s, i) => [s.id, opening[i]])),
  changed: new Set(),
  feed: [],
}

// Pure: same input, same output.
const a = step(start, seeded(7), 1000)
const b = step(start, seeded(7), 1000)
check("pure", [Object.entries(a.presence).sort(), [...a.changed].sort(), a.feed], [Object.entries(b.presence).sort(), [...b.changed].sort(), b.feed])
check("doesn't mutate its input", start.presence, Object.fromEntries(DEMO_STUDENTS.map((s, i) => [s.id, opening[i]])))

// Gentle: at most MAX_CHANGES students move per tick.
const random = seeded(4242)
let walk = start
let maxChanged = 0
let feedGrowth = 0
let ids = new Set<string>()
let totalMoves = 0
for (let t = 0; t < 600; t++) {
  const before = walk.feed.length
  walk = step(walk, random, 1_700_000_000_000 + t * 3800)
  maxChanged = Math.max(maxChanged, walk.changed.size)
  totalMoves += walk.changed.size
  if (walk.feed.length > before) feedGrowth++
  walk.feed.forEach((f) => ids.add(f.id))
  if (Object.keys(walk.presence).length !== DEMO_STUDENTS.length) { bad++; console.log("FAIL roster size drifted"); break }
}
check("at most 2 move per tick", maxChanged <= 2, true)
check("students actually move", totalMoves > 100, true)
check("roster stays whole", Object.keys(walk.presence).length, DEMO_STUDENTS.length)
check("every state is valid", Object.values(walk.presence).every((k) => PRESENCE_ORDER.includes(k)), true)
check("feed is capped", walk.feed.length <= FEED_MAX, true)
check("feed ids are unique", ids.size, [...ids].length)
check("results do arrive", feedGrowth > 5, true)
check("every feed entry has a score", walk.feed.every((f) => typeof f.score === "number" && f.score >= 30 && f.score <= 99), true)
check("newest first", walk.feed.every((f, i) => i === 0 || walk.feed[i - 1].at >= f.at), true)

check(
  "quiet students stay offline",
  DEMO_STUDENTS.filter((s) => s.lastSeenDays > 3).every((s) => walk.presence[s.id] === "offline"),
  true,
)

const active = Object.values(walk.presence).filter((k) => PRESENCE[k].active).length
console.log(`     after 600 ticks: ${active}/${DEMO_STUDENTS.length} active, ${walk.feed.length} in the feed, ${feedGrowth} results arrived`)
console.log(bad ? `\n${bad} FAILED` : "\nall pass")
