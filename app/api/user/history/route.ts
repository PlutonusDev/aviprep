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

    const examAttempts = await prisma.examAttempt.findMany({
      where: { userId: payload.userId },
      orderBy: { completedAt: "desc" },
    })

    const history = examAttempts.map((attempt) => ({
      id: attempt.id,
      subjectId: attempt.subjectId,
      subjectName: attempt.subjectName,
      score: attempt.score,
      totalQuestions: attempt.totalQuestions,
      correctAnswers: attempt.correctAnswers,
      timeSpent: attempt.timeSpentMins,
      passed: attempt.passed,
      date: attempt.completedAt.toLocaleDateString("en-AU", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      completedAt: attempt.completedAt,
    }))

    return NextResponse.json({ history })
  } catch (error) {
    console.error("Error fetching history:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
