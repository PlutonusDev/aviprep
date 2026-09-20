import { PRESENCE_ORDER, countByPresence, seeded, type PresenceKey } from "../lib/demo/presence"
import { DEMO_STUDENTS } from "../lib/demo/school"

function start(index: number, lastSeenDays: number, offset: number): PresenceKey {
  if (lastSeenDays >= 4) return "offline"
  const roll = seeded(index * 2654435761 + offset)()
  if (lastSeenDays === 0) {
    if (roll < 0.17) return "exam"
    if (roll < 0.47) return "course"
    if (roll < 0.62) return "forum"
    if (roll < 0.86) return "online"
    return "idle"
  }
  if (lastSeenDays <= 2) {
    if (roll < 0.22) return "course"
    if (roll < 0.34) return "forum"
    if (roll < 0.6) return "online"
    if (roll < 0.8) return "idle"
    return "offline"
  }
  if (roll < 0.25) return "online"
  if (roll < 0.55) return "idle"
  return "offline"
}

for (let offset = 1; offset < 200; offset++) {
  const c = countByPresence(DEMO_STUDENTS.map((s, i) => start(i, s.lastSeenDays, offset)))
  // A demo wants someone mid-exam, people in a course and in the forums.
  if (c.exam >= 1 && c.exam <= 2 && c.course >= 2 && c.forum >= 1 && c.online >= 2 && c.idle >= 1) {
    console.log(offset, PRESENCE_ORDER.map((k) => `${k}=${c[k]}`).join(" "))
    if (offset > 60) break
  }
}
