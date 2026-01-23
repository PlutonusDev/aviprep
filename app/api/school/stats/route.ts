import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"
import { formatDistanceToNow } from "date-fns"

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

    // Get the user and verify they're a flight school admin
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, isFlightSchoolAdmin: true },
    })

    if (!user?.isFlightSchoolAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    // Get the flight school
    const school = await prisma.flightSchool.findUnique({
      where: { adminId: user.id },
      select: { id: true },
    })

    if (!school) {
      return NextResponse.json({ error: "Flight school not found" }, { status: 404 })
    }

    // Get all students for this school
    const students = await prisma.user.findMany({
      where: { flightSchoolId: school.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        examAttempts: {
          orderBy: { completedAt: "desc" },
          take: 10,
          select: {
            id: true,
            subjectName: true,
            score: true,
            passed: true,
            completedAt: true,
          },
        },
      },
    })

    // Calculate stats
    const allExams = students.flatMap((s) => s.examAttempts)
    const totalExamsTaken = allExams.length
    const passedExams = allExams.filter((e) => e.passed).length
    const passRate = totalExamsTaken > 0 ? Math.round((passedExams / totalExamsTaken) * 100) : 0
    const averageScore =
      totalExamsTaken > 0 ? Math.round(allExams.reduce((sum, e) => sum + e.score, 0) / totalExamsTaken) : 0

    // Active students (took an exam in the last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const activeStudents = students.filter((s) =>
      s.examAttempts.some((e) => new Date(e.completedAt) > sevenDaysAgo)
    ).length

    // Recent activity
    const recentActivity = allExams
      .slice(0, 10)
      .map((exam) => {
        const student = students.find((s) => s.examAttempts.some((e) => e.id === exam.id))
        return {
          id: exam.id,
          studentName: student ? `${student.firstName} ${student.lastName}` : "Unknown",
          action: "Completed exam",
          subject: exam.subjectName,
          score: exam.score,
          timestamp: formatDistanceToNow(new Date(exam.completedAt), { addSuffix: true }),
        }
      })

    // Top performers (by average score)
    const studentScores = students
      .filter((s) => s.examAttempts.length > 0)
      .map((s) => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        score: Math.round(s.examAttempts.reduce((sum, e) => sum + e.score, 0) / s.examAttempts.length),
        examsCompleted: s.examAttempts.length,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    // Needs attention (students with no activity in 14 days or low scores)
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    
    const needsAttention = students
      .filter((s) => {
        const lastExam = s.examAttempts[0]
        const avgScore =
          s.examAttempts.length > 0
            ? s.examAttempts.reduce((sum, e) => sum + e.score, 0) / s.examAttempts.length
            : 0

        // No exams at all, inactive for 14+ days, or average score below 60%
        return (
          s.examAttempts.length === 0 ||
          (lastExam && new Date(lastExam.completedAt) < fourteenDaysAgo) ||
          avgScore < 60
        )
      })
      .slice(0, 5)
      .map((s) => {
        const lastExam = s.examAttempts[0]
        const avgScore =
          s.examAttempts.length > 0
            ? Math.round(s.examAttempts.reduce((sum, e) => sum + e.score, 0) / s.examAttempts.length)
            : 0

        let issue = "No activity yet"
        if (s.examAttempts.length > 0 && avgScore < 60) {
          issue = `Average score: ${avgScore}%`
        } else if (lastExam && new Date(lastExam.completedAt) < fourteenDaysAgo) {
          issue = "Inactive for 2+ weeks"
        }

        return {
          id: s.id,
          name: `${s.firstName} ${s.lastName}`,
          issue,
          lastActive: lastExam
            ? formatDistanceToNow(new Date(lastExam.completedAt), { addSuffix: true })
            : "Never",
        }
      })

    // Calculate average progress (simplified - based on exam completion)
    const averageProgress = students.length > 0
      ? Math.round(students.reduce((sum, s) => sum + Math.min(s.examAttempts.length * 10, 100), 0) / students.length)
      : 0

    return NextResponse.json({
      totalStudents: students.length,
      activeStudents,
      averageProgress,
      averageScore,
      totalExamsTaken,
      passRate,
      recentActivity,
      topPerformers: studentScores,
      needsAttention,
    })
  } catch (error) {
    console.error("School stats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
