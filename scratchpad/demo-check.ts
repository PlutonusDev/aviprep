import { DEMO_STUDENTS, DEMO_ATTEMPTS, schoolStats, rosterByGroup, DEMO_SEATS, subjectCode, studentSummary, DEMO_GROUPS, membersOf } from "../lib/demo/school"

console.log("students", DEMO_STUDENTS.length, "attempts", DEMO_ATTEMPTS.length)
console.log("stats", schoolStats())
console.log("seats", DEMO_SEATS.map((s) => `${subjectCode(s.subjectId)} ${s.used}/${s.total}`).join(", "))
console.log("groups", DEMO_GROUPS.map((g) => `${g.name}=${membersOf(g.id).length}`).join(", "))
console.log("order", rosterByGroup.map((s) => s.groupId ?? "none").join(","))
for (const i of [0, 7, 12]) {
  const s = DEMO_STUDENTS[i]
  const sum = studentSummary(s)
  console.log(`${s.firstName} ${s.lastName}: avg=${sum.averageScore} exams=${sum.examCount} pass=${sum.passRate}% stalled=${sum.stalled}`)
}
const scores = DEMO_ATTEMPTS.map((a) => a.score)
console.log("score range", Math.min(...scores), "-", Math.max(...scores))
