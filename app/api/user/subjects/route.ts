import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@lib/auth"
import { prisma } from "@lib/prisma"
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
    const subjects = SUBJECTS.map((subject) => {
      // Check if user has access to this subject
      const purchase = user.purchases.find((p) => p.subjectId === subject.id && new Date(p.expiresAt) > new Date())
      const hasAccess = hasBundleAccess || !!purchase

      // Get exam attempts for this subject
      const subjectAttempts = user.examAttempts.filter((a) => a.subjectId === subject.id)
      const totalAttempts = subjectAttempts.length
      const totalCorrect = subjectAttempts.reduce((acc, a) => acc + a.correctAnswers, 0)
      const totalQuestions = subjectAttempts.reduce((acc, a) => acc + a.totalQuestions, 0)

      // Calculate average score
      const averageScore =
        totalAttempts > 0 ? Math.round(subjectAttempts.reduce((acc, a) => acc + a.score, 0) / totalAttempts) : 0

      const progress = Math.min(100, Math.round((totalQuestions / totalCorrect) * 100))

      // Get last attempt date
      const lastAttempt = subjectAttempts[0]?.completedAt

      return {
        ...subject,
        isPurchased: hasAccess,
        hasPrinting: hasBundleAccess || purchase?.hasPrinting || false,
        hasAiInsights: hasBundleAccess || purchase?.hasAiInsights || false,
        progress,
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
