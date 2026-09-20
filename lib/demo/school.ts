/**
 * Sample data for the flight school demo portal (app/demo).
 *
 * Everything here is invented. No real school, person, ARN or result appears in
 * it, and nothing in the demo reads or writes the database - the portal is a
 * walkthrough of the real panel, not a copy of anyone's records.
 *
 * Deterministic on purpose: results come from a seeded generator rather than
 * Math.random, so the server and the browser render the same numbers and a
 * demo looks the same every time it's shown.
 */

import { SUBJECTS } from "@lib/subjects"

export const PASS_MARK = 70

/** How long without opening AviPrep before a student is worth chasing. */
export const STALLED_AFTER_DAYS = 10

export const DEMO_SCHOOL = {
  name: "Windsock Flight Training",
  shortName: "Windsock",
  subdomain: "windsock",
  tier: "Professional",
  maxStudents: 60,
  primaryColour: "#1d4ed8",
  accentColour: "#f78601",
  welcomeMessage: "Welcome to Windsock. Your theory work lives here - have a look at what's due this week.",
} as const

/* --- The roster -------------------------------------------------------------- */

export interface DemoStudent {
  id: string
  firstName: string
  lastName: string
  email: string
  arn: string
  groupId: string | null
  /** Days since they last opened AviPrep. */
  lastSeenDays: number
  enrolledWeeksAgo: number
  /** Subjects they're working through, in order. */
  subjectIds: string[]
  /** Drives their results: 0 struggling, 1 flying. */
  aptitude: number
}

export interface DemoGroup {
  id: string
  name: string
  description: string
  color: string
  subjectIds: string[]
}

export const DEMO_GROUPS: DemoGroup[] = [
  {
    id: "g-cpl-26a",
    name: "CPL Feb intake",
    description: "Full-time CPL theory, February start.",
    color: "#3b82f6",
    subjectIds: ["cpl-agk", "cpl-aerodynamics", "cpl-meteorology", "cpl-navigation"],
  },
  {
    id: "g-ppl-evening",
    name: "PPL evenings",
    description: "Part-time PPL, Tuesday and Thursday nights.",
    color: "#10b981",
    subjectIds: ["ppl-agk", "ppl-meteorology", "ppl-air-law"],
  },
  {
    id: "g-ir",
    name: "IREX candidates",
    description: "Instrument rating theory.",
    color: "#8b5cf6",
    subjectIds: ["cpl-navigation", "cpl-meteorology"],
  },
]

const ROSTER: [string, string, string | null, number, number, number][] = [
  // first, last, group, lastSeenDays, enrolledWeeksAgo, aptitude
  ["Aisha", "Rahman", "g-cpl-26a", 0, 14, 0.92],
  ["Tom", "Keller", "g-cpl-26a", 1, 14, 0.74],
  ["Priya", "Nandal", "g-cpl-26a", 0, 13, 0.81],
  ["Jack", "Moroney", "g-cpl-26a", 9, 14, 0.38],
  ["Elise", "Vaughan", "g-cpl-26a", 2, 12, 0.66],
  ["Sam", "Okafor", "g-cpl-26a", 1, 12, 0.88],
  ["Bridie", "Cole", "g-cpl-26a", 4, 11, 0.57],
  ["Nathan", "Yip", "g-cpl-26a", 21, 14, 0.29],
  ["Georgia", "Pinto", "g-ppl-evening", 0, 8, 0.79],
  ["Callum", "Reid", "g-ppl-evening", 3, 8, 0.62],
  ["Mia", "Donnelly", "g-ppl-evening", 1, 7, 0.71],
  ["Hugo", "Baptiste", "g-ppl-evening", 6, 6, 0.45],
  ["Renee", "Tallis", "g-ir", 0, 5, 0.86],
  ["Dev", "Achari", "g-ir", 2, 5, 0.77],
  ["Marcus", "Lowell", "g-ir", 12, 4, 0.51],
  ["Steph", "Kuang", null, 1, 2, 0.68],
  ["Owen", "Brady", null, 5, 2, 0.59],
]

/** A small LCG: same sequence every render, no dependency on Math.random. */
function seeded(seed: number) {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

const slug = (first: string, last: string) => `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, "")

const SUBJECT_POOL = ["cpl-agk", "cpl-aerodynamics", "cpl-meteorology", "cpl-navigation", "cpl-air-law", "cpl-human-factors"].filter((id) =>
  SUBJECTS.some((s) => s.id === id),
)

export const DEMO_STUDENTS: DemoStudent[] = ROSTER.map(([firstName, lastName, groupId, lastSeenDays, enrolledWeeksAgo, aptitude], i) => {
  const random = seeded(i * 7919 + 17)
  const count = 2 + Math.floor(random() * 3)
  return {
    id: `s-${i + 1}`,
    firstName,
    lastName,
    email: `${slug(firstName, lastName)}@example.com`,
    arn: String(600000 + i * 1373),
    groupId,
    lastSeenDays,
    enrolledWeeksAgo,
    subjectIds: SUBJECT_POOL.slice(0, count),
    aptitude,
  }
})

/* --- Results ----------------------------------------------------------------- */

export interface DemoAttempt {
  id: string
  studentId: string
  subjectId: string
  score: number
  passed: boolean
  /** Days before today. */
  daysAgo: number
  totalQuestions: number
  correctAnswers: number
  minutes: number
}

/**
 * Sittings per student, improving over time the way real practice does: an
  * early run of low scores, then a climb whose slope is their aptitude.
 */
export const DEMO_ATTEMPTS: DemoAttempt[] = DEMO_STUDENTS.flatMap((student, si) => {
  const random = seeded(si * 104729 + 3)
  return student.subjectIds.flatMap((subjectId, sj) => {
    const sittings = 2 + Math.floor(random() * 5)
    return Array.from({ length: sittings }, (_, k) => {
      const progress = sittings === 1 ? 1 : k / (sittings - 1)
      const base = 40 + student.aptitude * 34
      const climb = progress * (12 + student.aptitude * 22)
      const wobble = (random() - 0.5) * 9
      const score = Math.max(18, Math.min(99, Math.round(base + climb + wobble)))
      const totalQuestions = 40
      return {
        id: `a-${student.id}-${sj}-${k}`,
        studentId: student.id,
        subjectId,
        score,
        passed: score >= PASS_MARK,
        daysAgo: Math.max(0, Math.round((sittings - k) * 6 + random() * 4 + student.lastSeenDays)),
        totalQuestions,
        correctAnswers: Math.round((score / 100) * totalQuestions),
        minutes: 35 + Math.round(random() * 40),
      }
    })
  })
})

/* --- Derived ----------------------------------------------------------------- */

const attemptsByStudent = new Map<string, DemoAttempt[]>()
for (const a of DEMO_ATTEMPTS) {
  const list = attemptsByStudent.get(a.studentId) ?? []
  list.push(a)
  attemptsByStudent.set(a.studentId, list)
}
for (const list of attemptsByStudent.values()) list.sort((a, b) => a.daysAgo - b.daysAgo)

export const attemptsFor = (studentId: string) => attemptsByStudent.get(studentId) ?? []

export const averageOf = (attempts: DemoAttempt[]) =>
  attempts.length ? Math.round(attempts.reduce((n, a) => n + a.score, 0) / attempts.length) : null

export function studentSummary(student: DemoStudent) {
  const attempts = attemptsFor(student.id)
  const passed = attempts.filter((a) => a.passed).length
  return {
    attempts,
    examCount: attempts.length,
    averageScore: averageOf(attempts),
    passRate: attempts.length ? Math.round((passed / attempts.length) * 100) : 0,
    passedExams: passed,
    studyMinutes: attempts.reduce((n, a) => n + a.minutes, 0),
    /** Not opened in ten days: the number a school actually acts on. */
    stalled: student.lastSeenDays >= STALLED_AFTER_DAYS,
  }
}

export const groupById = (id: string | null) => DEMO_GROUPS.find((g) => g.id === id) ?? null

export const membersOf = (groupId: string) => DEMO_STUDENTS.filter((s) => s.groupId === groupId)

export const subjectName = (id: string) => SUBJECTS.find((s) => s.id === id)?.name ?? id
export const subjectCode = (id: string) => SUBJECTS.find((s) => s.id === id)?.code ?? id

/** Students ordered the way the real table orders them: by group, then by name. */
export const rosterByGroup = [...DEMO_STUDENTS].sort((a, b) => {
  const ga = groupById(a.groupId)?.name ?? null
  const gb = groupById(b.groupId)?.name ?? null
  if (ga !== gb) {
    if (ga === null) return 1
    if (gb === null) return -1
    return ga.localeCompare(gb)
  }
  return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
})

export function schoolStats() {
  const summaries = DEMO_STUDENTS.map(studentSummary)
  const withResults = summaries.filter((s) => s.averageScore !== null)
  return {
    students: DEMO_STUDENTS.length,
    seats: DEMO_SCHOOL.maxStudents,
    activeThisWeek: DEMO_STUDENTS.filter((s) => s.lastSeenDays <= 7).length,
    stalled: summaries.filter((s) => s.stalled).length,
    exams: DEMO_ATTEMPTS.length,
    averageScore: withResults.length ? Math.round(withResults.reduce((n, s) => n + (s.averageScore ?? 0), 0) / withResults.length) : 0,
    atOrAbovePass: withResults.filter((s) => (s.averageScore ?? 0) >= PASS_MARK).length,
  }
}

/** Seats bought per subject, for the purchases view. */
export const DEMO_SEATS = [
  { subjectId: SUBJECT_POOL[0], total: 30, used: 24, expiresInMonths: 8 },
  { subjectId: SUBJECT_POOL[1], total: 30, used: 22, expiresInMonths: 8 },
  { subjectId: SUBJECT_POOL[2], total: 20, used: 15, expiresInMonths: 5 },
  { subjectId: SUBJECT_POOL[3], total: 20, used: 9, expiresInMonths: 5 },
].filter((s) => s.subjectId)

export const DEMO_INSTRUCTORS = [
  { id: "i-1", firstName: "Dana", lastName: "Whitmore", email: "dana@example.com", role: "Head of theory", isOwner: true },
  { id: "i-2", firstName: "Rob", lastName: "Castellan", email: "rob@example.com", role: "Grade 1 instructor", isOwner: false },
  { id: "i-3", firstName: "Lina", lastName: "Ferrante", email: "lina@example.com", role: "Grade 2 instructor", isOwner: false },
]

export const DEMO_INVITES = [{ email: "theo@example.com", sentDaysAgo: 2, invitedBy: "Dana Whitmore" }]
