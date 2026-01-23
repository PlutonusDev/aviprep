import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"

async function authenticateApiKey(request: Request) {
  const authHeader = request.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }

  const apiKey = authHeader.slice(7)
  const school = await prisma.flightSchool.findUnique({
    where: { apiKey },
    select: { id: true, apiEnabled: true },
  })

  if (!school || !school.apiEnabled) {
    return null
  }

  return school
}

async function verifyStudentAccess(schoolId: string, studentId: string) {
  const student = await prisma.user.findFirst({
    where: { id: studentId, flightSchoolId: schoolId },
  })
  return student
}

export async function GET(request: Request, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const { studentId } = await params
    const school = await authenticateApiKey(request)
    if (!school) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const student = await verifyStudentAccess(school.id, studentId)
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const fullStudent = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        arn: true,
        phone: true,
        enrolledAt: true,
        createdAt: true,
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
          select: {
            topic: true,
            subjectId: true,
            subjectName: true,
            accuracy: true,
            priority: true,
          },
        },
      },
    })

    if (!fullStudent) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Calculate stats
    const exams = fullStudent.examAttempts
    const totalExams = exams.length
    const passedExams = exams.filter((e) => e.passed).length
    const averageScore =
      totalExams > 0 ? Math.round(exams.reduce((sum, e) => sum + e.score, 0) / totalExams) : null

    return NextResponse.json({
      id: fullStudent.id,
      email: fullStudent.email,
      firstName: fullStudent.firstName,
      lastName: fullStudent.lastName,
      arn: fullStudent.arn,
      phone: fullStudent.phone,
      enrolledAt: fullStudent.enrolledAt,
      createdAt: fullStudent.createdAt,
      stats: {
        totalExams,
        passedExams,
        passRate: totalExams > 0 ? Math.round((passedExams / totalExams) * 100) : 0,
        averageScore,
      },
      recentExams: exams.slice(0, 10),
      weakPoints: fullStudent.weakPoints,
    })
  } catch (error) {
    console.error("API get student error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const { studentId } = await params
    const school = await authenticateApiKey(request)
    if (!school) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const student = await verifyStudentAccess(school.id, studentId)
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Remove student from school
    await prisma.user.update({
      where: { id: studentId },
      data: { flightSchoolId: null, enrolledAt: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API delete student error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
