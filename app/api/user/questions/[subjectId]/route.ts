import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@lib/auth"
import { prisma } from "@lib/prisma"
import { getSubjectById } from "@lib/subjects"
import { getSchoolGrantedSubjectIds } from "@lib/school-access"
import { lastResults, selectExamQuestions, type PastResult } from "@lib/question-selection"

// Every exam is a fresh draw, so never serve it from a cache.
export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: { params: Promise<{ subjectId: string }> }) {
  try {
    const { subjectId } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Verify subject exists
    const subject = getSubjectById(subjectId)
    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 })
    }

    // Check if user has access to this subject
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { purchases: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const hasBundleAccess = user.hasBundle && user.bundleExpiry && new Date(user.bundleExpiry) > new Date()
    const hasPurchase = user.purchases.some((p) => p.subjectId === subjectId && new Date(p.expiresAt) > new Date())

    const grants = await getSchoolGrantedSubjectIds(payload.userId)
    const hasSchoolGrant =
      grants.individual.includes(subjectId) || grants.group.includes(subjectId)

    if (!hasBundleAccess && !hasPurchase && !hasSchoolGrant) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const allQuestions = await prisma.question.findMany({
      // Drafts and in-review questions must never reach a student. Rows written
      // before the status field exist with no status and were already live.
      where: {
        subjectId,
        OR: [{ status: "published" }, { status: null }],
      },
      select: {
        id: true,
        topic: true,
        difficulty: true,
        questionText: true,
        options: true,
        correctIndex: true,
        explanation: true,
      },
    })

    // What the student last did with each question, oldest attempt first so
    // the most recent result wins.
    const attempts = await prisma.examAttempt.findMany({
      where: { userId: payload.userId, subjectId },
      orderBy: { completedAt: "asc" },
      select: { questionResults: true },
    })
    const history = lastResults(
      attempts.map((a) => (Array.isArray(a.questionResults) ? (a.questionResults as unknown as PastResult[]) : [])),
    )

    const { questions, unseen, lastWrong, allSeen } = selectExamQuestions({ bank: allQuestions, history })

    return NextResponse.json({
      subject,
      questions,
      passScore: 70,
      totalAvailable: allQuestions.length,
      pool: { unseen, lastWrong, allSeen },
    })
  } catch (error) {
    console.error("Error fetching questions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
