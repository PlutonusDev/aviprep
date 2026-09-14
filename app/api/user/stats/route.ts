import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@lib/auth"
import { prisma } from "@lib/prisma"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Get user with all related data
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        examAttempts: {
          orderBy: { completedAt: "desc" },
        },
        studySessions: {
          orderBy: { startedAt: "desc" },
        },
        // Priority is a string, so ordering by it was alphabetical ("high" < "low" < "medium").
        weakPoints: {
          orderBy: { accuracy: "asc" },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Calculate overall stats
    const totalExams = user.examAttempts.length
    const passedExams = user.examAttempts.filter((e) => e.passed).length
    const averageScore =
      totalExams > 0 ? Math.round(user.examAttempts.reduce((acc, e) => acc + e.score, 0) / totalExams) : 0

    const totalQuestionsAnswered = user.examAttempts.reduce((acc, e) => acc + e.totalQuestions, 0)
    const totalCorrectAnswers = user.examAttempts.reduce((acc, e) => acc + e.correctAnswers, 0)

    // Calculate study streak (consecutive days with activity)
    const studyStreak = calculateStudyStreak(user.examAttempts, user.studySessions)

    // Calculate total study hours
    const totalStudyMins = user.studySessions.reduce((acc, s) => acc + s.durationMins, 0)
    const totalStudyHours = Math.round(totalStudyMins / 60)

    // Weekly averages over the last 12 weeks. 30 days gave at most five points.
    const twelveWeeksAgo = new Date()
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84)

    const recentAttempts = user.examAttempts.filter((a) => new Date(a.completedAt) >= twelveWeeksAgo)

    const performanceData = groupByWeek(recentAttempts)

    // Every recent sitting as its own point, oldest first, for the score trend.
    const recentScores = user.examAttempts
      .slice(0, 30)
      .reverse()
      .map((a) => ({
        id: a.id,
        completedAt: a.completedAt,
        score: a.score,
        passed: a.passed,
        subjectName: a.subjectName,
      }))

    // Study time by day of week
    const studyTimeData = getStudyTimeByDay(user.studySessions)

    return NextResponse.json({
      stats: {
        averageScore,
        totalExams,
        passedExams,
        passRate: totalExams > 0 ? Math.round((passedExams / totalExams) * 100) : 0,
        questionsAnswered: totalQuestionsAnswered,
        correctAnswers: totalCorrectAnswers,
        studyStreak,
        totalStudyHours,
      },
      performanceData,
      recentScores,
      studyTimeData,
      weakPoints: user.weakPoints,
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function calculateStudyStreak(examAttempts: { completedAt: Date }[], studySessions: { startedAt: Date }[]): number {
  // Combine all activity dates
  const activityDates = new Set<string>()

  examAttempts.forEach((a) => {
    activityDates.add(new Date(a.completedAt).toDateString())
  })

  studySessions.forEach((s) => {
    activityDates.add(new Date(s.startedAt).toDateString())
  })

  if (activityDates.size === 0) return 0

  // Sort dates descending
  const sortedDates = Array.from(activityDates)
    .map((d) => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime())

  // Count consecutive days from today
  let streak = 0
  let currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)

  for (const date of sortedDates) {
    date.setHours(0, 0, 0, 0)
    const diffDays = Math.floor((currentDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays <= 1) {
      streak++
      currentDate = date
    } else {
      break
    }
  }

  return streak
}

function groupByWeek(attempts: { completedAt: Date; score: number }[]) {
  const grouped = new Map<string, { total: number; count: number }>()

  attempts.forEach((attempt) => {
    const weekStart = new Date(attempt.completedAt)
    weekStart.setHours(0, 0, 0, 0)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const key = localDateKey(weekStart)

    const existing = grouped.get(key) || { total: 0, count: 0 }
    grouped.set(key, { total: existing.total + attempt.score, count: existing.count + 1 })
  })

  // Sorted on the ISO key. It used to sort the formatted label ("12 Mar"), which
  // new Date() can't parse reliably, so the chart could run backwards.
  return Array.from(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      const [y, m, d] = key.split("-").map(Number)
      return {
        weekStart: key,
        date: new Date(y, m - 1, d).toLocaleDateString("en-AU", { month: "short", day: "numeric" }),
        score: Math.round(value.total / value.count),
        count: value.count,
      }
    })
}

function localDateKey(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Hours studied on each of the last seven days, oldest first and ending today.
 * It used to be bucketed Sun-Sat, so today could sit in the middle of the chart
 * and last week's Tuesday blended into this week's.
 */
function getStudyTimeByDay(sessions: { startedAt: Date; durationMins: number }[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - i))
    return { key: localDateKey(date), date }
  })
  const totals = new Map(days.map((d) => [d.key, 0]))

  for (const session of sessions) {
    const key = localDateKey(new Date(session.startedAt))
    if (totals.has(key)) totals.set(key, totals.get(key)! + session.durationMins)
  }

  return days.map(({ key, date }, i) => ({
    date: key,
    day: i === 6 ? "Today" : date.toLocaleDateString("en-AU", { weekday: "short" }),
    minutes: totals.get(key)!,
    hours: Math.round((totals.get(key)! / 60) * 10) / 10,
  }))
}
