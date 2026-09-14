import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@lib/auth"
import { prisma } from "@lib/prisma"
import { getPublishedCountsBySubject } from "@lib/question-counts"
import { getSchoolGrantedSubjectIds } from "@lib/school-access"
import { SUBJECTS } from "@lib/products"

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

    // Get user with purchases and exam attempts
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        purchases: true,
        examAttempts: {
          orderBy: { completedAt: "desc" },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if user has bundle access
    const hasBundleAccess = user.hasBundle && user.bundleExpiry && new Date(user.bundleExpiry) > new Date()

    // Build subject data with user's progress
    // The real, practisable bank - not the catalogue figure in lib/subjects.ts.
    const [publishedCounts, schoolGrants] = await Promise.all([
      getPublishedCountsBySubject(),
      getSchoolGrantedSubjectIds(payload.userId),
    ])
    const granted = new Set([...schoolGrants.individual, ...schoolGrants.group])

    const subjects = SUBJECTS.map((subject) => {
      const questionBankSize = publishedCounts[subject.id] ?? 0
      // Check if user has access to this subject
      const purchase = user.purchases.find((p) => p.subjectId === subject.id && new Date(p.expiresAt) > new Date())
      const hasAccess = hasBundleAccess || !!purchase || granted.has(subject.id)

      // Get exam attempts for this subject
      const subjectAttempts = user.examAttempts.filter((a) => a.subjectId === subject.id)
      const totalAttempts = subjectAttempts.length
      const totalCorrect = subjectAttempts.reduce((acc, a) => acc + a.correctAnswers, 0)
      const totalQuestions = subjectAttempts.reduce((acc, a) => acc + a.totalQuestions, 0)

      // Calculate average score
      const averageScore =
        totalAttempts > 0 ? Math.round(subjectAttempts.reduce((acc, a) => acc + a.score, 0) / totalAttempts) : 0

      // Coverage of the subject's question bank. The operands used to be the
      // other way round, which made this always 100 (or NaN with no attempts).
      const progress =
        questionBankSize > 0
          ? Math.min(100, Math.round((totalQuestions / questionBankSize) * 100))
          : 0

      // Share of answered questions that were correct.
      const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0

      // Get last attempt date
      const lastAttempt = subjectAttempts[0]?.completedAt

      return {
        ...subject,
        // Overrides the catalogue figure from SUBJECTS with the real count.
        totalQuestions: questionBankSize,
        catalogueQuestions: subject.totalQuestions,
        isPurchased: hasAccess,
        hasPrinting: hasBundleAccess || purchase?.hasPrinting || false,
        hasAiInsights: hasBundleAccess || purchase?.hasAiInsights || false,
        progress,
        accuracy,
        questionsAttempted: totalQuestions,
        correctAnswers: totalCorrect,
        averageScore,
        examsCompleted: totalAttempts,
        lastAttempt,
      }
    });

    return NextResponse.json({ subjects, hasBundleAccess })
  } catch (error) {
    console.error("Error fetching subjects:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
