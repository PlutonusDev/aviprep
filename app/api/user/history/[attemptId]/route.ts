import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@lib/auth"
import { prisma } from "@lib/prisma"

interface StoredResult {
  questionId?: string
  topic?: string
  correct?: boolean
  /** Only on attempts saved after answers started being recorded. */
  selectedIndex?: number | null
  /** What they typed, on questions answered with a value. */
  answerText?: string | null
  flagged?: boolean
  timeTaken?: number
}

const OBJECT_ID = /^[a-f0-9]{24}$/i

/** One past attempt, with each question joined back to the bank for review. */
export async function GET(_request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = await verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    const { attemptId } = await params
    // A malformed id would make Prisma throw; treat it as simply not found.
    if (!OBJECT_ID.test(attemptId)) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId } })
    // Someone else's attempt is reported as missing, not forbidden, so ids can't be probed.
    if (!attempt || attempt.userId !== payload.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const stored: StoredResult[] = Array.isArray(attempt.questionResults)
      ? (attempt.questionResults as unknown as StoredResult[])
      : []

    const ids = Array.from(
      new Set(stored.map((r) => r.questionId).filter((id): id is string => !!id && OBJECT_ID.test(id))),
    )
    const questions = ids.length
      ? await prisma.question.findMany({
          where: { id: { in: ids } },
          select: {
            id: true,
            topic: true,
            questionText: true,
            imageUrl: true,
            imageAlt: true,
            answerType: true,
            options: true,
            correctIndex: true,
            answerValue: true,
            answerUnit: true,
            tolerance: true,
            toleranceType: true,
            explanation: true,
          },
        })
      : []
    const byId = new Map(questions.map((q) => [q.id, q]))

    const items = stored.map((r, i) => {
      const q = r.questionId ? byId.get(r.questionId) : undefined
      const typed = q?.answerType === "numeric"
      const answerText = typeof r.answerText === "string" ? r.answerText : null
      // A typed answer records what they wrote rather than an option index, so
      // "answered" means different things for the two kinds.
      const recorded = typed ? true : r.selectedIndex !== undefined
      const selectedIndex = typed ? null : r.selectedIndex !== undefined ? (r.selectedIndex ?? null) : undefined
      const blank = typed ? !answerText?.trim() : recorded && selectedIndex === null
      // Older attempts only know right or wrong, so a skip reads as incorrect there.
      const status = r.correct ? "correct" : blank ? "skipped" : "incorrect"
      return {
        key: `${r.questionId ?? "q"}-${i}`,
        number: i + 1,
        topic: q?.topic ?? r.topic ?? "",
        questionText: q ? q.questionText : null,
        imageUrl: q?.imageUrl ?? null,
        imageAlt: q?.imageAlt ?? null,
        answerType: q?.answerType ?? null,
        options: q?.options ?? [],
        correctIndex: q?.correctIndex ?? -1,
        answerValue: q?.answerValue ?? null,
        answerUnit: q?.answerUnit ?? null,
        tolerance: q?.tolerance ?? null,
        toleranceType: q?.toleranceType ?? null,
        explanation: q?.explanation ?? null,
        selectedIndex,
        answerText,
        status,
        flagged: !!r.flagged,
      }
    })

    return NextResponse.json({
      attempt: {
        id: attempt.id,
        subjectId: attempt.subjectId,
        subjectName: attempt.subjectName,
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
        correctAnswers: attempt.correctAnswers,
        timeSpent: attempt.timeSpentMins,
        passed: attempt.passed,
        completedAt: attempt.completedAt,
      },
      items,
      /** False for attempts saved before chosen answers were recorded. */
      answersRecorded: stored.some((r) => r.selectedIndex !== undefined || typeof r.answerText === "string"),
    })
  } catch (error) {
    console.error("Error fetching attempt:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
