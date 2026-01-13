import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@lib/auth"
import { prisma } from "@lib/prisma"
import { getSubjectById } from "@lib/subjects"

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

    if (!hasBundleAccess && !hasPurchase) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const allQuestions = await prisma.question.findMany({
      where: { subjectId },
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

    // Shuffle and take max 20 questions
    const shuffled = allQuestions.sort(() => Math.random() - 0.5)
    const questions = shuffled.slice(0, 20)

    return NextResponse.json({
      subject,
      questions,
      passScore: 70,
      totalAvailable: allQuestions.length,
    })
  } catch (error) {
    console.error("Error fetching questions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
