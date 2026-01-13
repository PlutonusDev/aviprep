import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@lib/auth"
import { prisma } from "@lib/prisma"
import { getSubjectById } from "@lib/subjects"

export async function POST(request: Request) {
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

    const body = await request.json()
    const { subjectId, score, totalQuestions, correctAnswers, timeSpentMins, questionResults } = body

    // Validate input
    if (!subjectId || score === undefined || !totalQuestions || correctAnswers === undefined || (!timeSpentMins && timeSpentMins !== 0)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const subject = getSubjectById(subjectId)
    if (!subject) {
      return NextResponse.json({ error: "Invalid subject" }, { status: 400 })
    }

    const passed = score >= 70

    // Create exam attempt record
    const examAttempt = await prisma.examAttempt.create({
      data: {
        userId: payload.userId,
        subjectId,
        subjectName: subject.name,
        score,
        totalQuestions,
        correctAnswers,
        timeSpentMins,
        passed,
        questionResults: questionResults || [],
      },
    })

    const now = new Date()
    const startedAt = new Date(now.getTime() - timeSpentMins * 60 * 1000)

    await prisma.studySession.create({
      data: {
        userId: payload.userId,
        subjectId,
        durationMins: timeSpentMins,
        startedAt,
        endedAt: now,
      },
    })

    // Update weak points based on results
    if (questionResults && Array.isArray(questionResults)) {
      await updateWeakPoints(payload.userId, subjectId, subject.name, questionResults)
    }

    return NextResponse.json({
      success: true,
      examAttempt,
      passed,
    })
  } catch (error) {
    console.error("Error completing exam:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function updateWeakPoints(
  userId: string,
  subjectId: string,
  subjectName: string,
  questionResults: Array<{ topic: string; correct: boolean }>,
) {
  // Group results by topic
  const topicResults = new Map<string, { correct: number; total: number }>()

  questionResults.forEach((result) => {
    const existing = topicResults.get(result.topic) || { correct: 0, total: 0 }
    topicResults.set(result.topic, {
      correct: existing.correct + (result.correct ? 1 : 0),
      total: existing.total + 1,
    })
  })

  // Update weak points for each topic
  for (const [topic, results] of Array.from(topicResults.entries())) {
    // Get existing weak point if it exists
    const existingWeakPoint = await prisma.weakPoint.findUnique({
      where: {
        userId_topic_subjectId: {
          userId,
          topic,
          subjectId,
        },
      },
    })

    // Calculate new accuracy (weighted average if existing data)
    let newAccuracy: number
    let newQuestionsAttempted: number

    if (existingWeakPoint) {
      // Weighted average of old and new accuracy
      const oldTotal = existingWeakPoint.questionsAttempted
      const newTotal = results.total
      const combinedTotal = oldTotal + newTotal
      const oldCorrect = Math.round((existingWeakPoint.accuracy / 100) * oldTotal)
      const newCorrect = results.correct
      newAccuracy = Math.round(((oldCorrect + newCorrect) / combinedTotal) * 100)
      newQuestionsAttempted = combinedTotal
    } else {
      newAccuracy = Math.round((results.correct / results.total) * 100)
      newQuestionsAttempted = results.total
    }

    // Determine priority based on accuracy
    let priority: "high" | "medium" | "low"
    let recommendation: string

    if (newAccuracy < 50) {
      priority = "high"
      recommendation = `Focus on mastering ${topic} fundamentals. Review study materials and practice more questions.`
    } else if (newAccuracy < 70) {
      priority = "medium"
      recommendation = `Good progress on ${topic}. Continue practicing to reach exam standard.`
    } else {
      priority = "low"
      recommendation = `Strong performance in ${topic}. Maintain knowledge with occasional review.`
    }

    // Upsert weak point
    await prisma.weakPoint.upsert({
      where: {
        userId_topic_subjectId: {
          userId,
          topic,
          subjectId,
        },
      },
      update: {
        accuracy: newAccuracy,
        questionsAttempted: newQuestionsAttempted,
        priority,
        recommendation,
      },
      create: {
        userId,
        topic,
        subjectId,
        subjectName,
        accuracy: newAccuracy,
        questionsAttempted: newQuestionsAttempted,
        priority,
        recommendation,
      },
    })
  }
}
