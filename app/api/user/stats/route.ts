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
        weakPoints: {
          orderBy: { priority: "asc" },
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

    // Get performance over time (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentAttempts = user.examAttempts.filter((a) => new Date(a.completedAt) >= thirtyDaysAgo)

    // Group by week for chart data
    const performanceData = groupByWeek(recentAttempts)

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
  const weeks: { date: string; score: number; count: number }[] = []
  const grouped = new Map<string, { total: number; count: number }>()

  attempts.forEach((attempt) => {
    const date = new Date(attempt.completedAt)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    const key = weekStart.toISOString().split("T")[0]

    const existing = grouped.get(key) || { total: 0, count: 0 }
    grouped.set(key, {
      total: existing.total + attempt.score,
      count: existing.count + 1,
    })
  })

  grouped.forEach((value, key) => {
    const date = new Date(key)
    weeks.push({
      date: date.toLocaleDateString("en-AU", { month: "short", day: "numeric" }),
      score: Math.round(value.total / value.count),
      count: value.count,
    })
  })

  return weeks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

function getStudyTimeByDay(sessions: { startedAt: Date; durationMins: number }[]) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const dayTotals = new Array(7).fill(0)

  // Only count last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  sessions
    .filter((s) => new Date(s.startedAt) >= sevenDaysAgo)
    .forEach((session) => {
      const dayIndex = new Date(session.startedAt).getDay()
      dayTotals[dayIndex] += session.durationMins / 60
    })

  return days.map((day, index) => ({
    day,
    hours: Math.round(dayTotals[index] * 10) / 10,
  }))
}
