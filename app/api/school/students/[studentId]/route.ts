import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"

async function verifySchoolAccess(userId: string, studentId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isFlightSchoolAdmin: true },
  })

  if (!user?.isFlightSchoolAdmin) return null

  const school = await prisma.flightSchool.findUnique({
    where: { adminId: userId },
    select: { id: true },
  })

  if (!school) return null

  // Verify student belongs to this school
  const student = await prisma.user.findFirst({
    where: { id: studentId, flightSchoolId: school.id },
  })

  return student ? school : null
}

export async function GET(request: Request, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const { studentId } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const school = await verifySchoolAccess(payload.userId, studentId)
    if (!school) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        arn: true,
        phone: true,
        profilePicture: true,
        enrolledAt: true,
        createdAt: true,
        purchases: {
          select: {
            id: true,
            subjectId: true,
            subjectName: true,
            purchaseType: true,
            expiresAt: true,
          },
        },
        examAttempts: {
          orderBy: { completedAt: "desc" },
          select: {
            id: true,
            subjectId: true,
            subjectName: true,
            score: true,
            passed: true,
            totalQuestions: true,
            correctAnswers: true,
            timeSpentMins: true,
            completedAt: true,
          },
        },
        weakPoints: {
          orderBy: { accuracy: "asc" },
          take: 5,
          select: {
            id: true,
            topic: true,
            subjectName: true,
            accuracy: true,
            priority: true,
          },
        },
        studySessions: {
          orderBy: { startedAt: "desc" },
          take: 30,
          select: {
            id: true,
            subjectId: true,
            durationMins: true,
            startedAt: true,
          },
        },
      },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Calculate stats
    const totalExams = student.examAttempts.length
    const passedExams = student.examAttempts.filter((e) => e.passed).length
    const averageScore =
      totalExams > 0
        ? Math.round(student.examAttempts.reduce((sum, e) => sum + e.score, 0) / totalExams)
        : null
    const totalStudyTime = student.studySessions.reduce((sum, s) => sum + s.durationMins, 0)

    // Group exams by subject for progress
    const subjectProgress: Record<string, { attempts: number; avgScore: number; passed: number }> = {}
    for (const exam of student.examAttempts) {
      if (!subjectProgress[exam.subjectId]) {
        subjectProgress[exam.subjectId] = { attempts: 0, avgScore: 0, passed: 0 }
      }
      subjectProgress[exam.subjectId].attempts++
      subjectProgress[exam.subjectId].avgScore += exam.score
      if (exam.passed) subjectProgress[exam.subjectId].passed++
    }
    for (const key of Object.keys(subjectProgress)) {
      subjectProgress[key].avgScore = Math.round(
        subjectProgress[key].avgScore / subjectProgress[key].attempts
      )
    }

    return NextResponse.json({
      student: {
        id: student.id,
        email: student.email,
        firstName: student.firstName,
        lastName: student.lastName,
        arn: student.arn,
        phone: student.phone,
        profilePicture: student.profilePicture,
        enrolledAt: student.enrolledAt,
        createdAt: student.createdAt,
      },
      stats: {
        totalExams,
        passedExams,
        passRate: totalExams > 0 ? Math.round((passedExams / totalExams) * 100) : 0,
        averageScore,
        totalStudyTime,
      },
      purchases: student.purchases,
      examAttempts: student.examAttempts,
      weakPoints: student.weakPoints,
      subjectProgress,
    })
  } catch (error) {
    console.error("Get student error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const { studentId } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const school = await verifySchoolAccess(payload.userId, studentId)
    if (!school) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    // Remove student from school (don't delete the user)
    await prisma.user.update({
      where: { id: studentId },
      data: { flightSchoolId: null, enrolledAt: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Remove student error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
