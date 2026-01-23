import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"

export async function GET(request: Request) {
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

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { isFlightSchoolAdmin: true },
    })

    if (!user?.isFlightSchoolAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    const school = await prisma.flightSchool.findUnique({
      where: { adminId: payload.userId },
      select: { id: true },
    })

    if (!school) {
      return NextResponse.json({ error: "Flight school not found" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const sortBy = searchParams.get("sortBy") || "score"

    // Build where clause
    const where: Record<string, unknown> = { flightSchoolId: school.id }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ]
    }

    // Get students with exam data
    const students = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profilePicture: true,
        examAttempts: {
          orderBy: { completedAt: "desc" },
          select: {
            id: true,
            subjectId: true,
            score: true,
            passed: true,
            completedAt: true,
          },
        },
      },
    })

    // Process student progress
    const processedStudents = students.map((student) => {
      const exams = student.examAttempts
      const totalExams = exams.length
      const passedExams = exams.filter((e) => e.passed).length
      const passRate = totalExams > 0 ? Math.round((passedExams / totalExams) * 100) : 0
      const averageScore =
        totalExams > 0 ? Math.round(exams.reduce((sum, e) => sum + e.score, 0) / totalExams) : null

      // Calculate subject scores
      const subjectScores: Record<string, number> = {}
      const subjectCounts: Record<string, number> = {}
      for (const exam of exams) {
        if (!subjectScores[exam.subjectId]) {
          subjectScores[exam.subjectId] = 0
          subjectCounts[exam.subjectId] = 0
        }
        subjectScores[exam.subjectId] += exam.score
        subjectCounts[exam.subjectId]++
      }
      for (const key of Object.keys(subjectScores)) {
        subjectScores[key] = Math.round(subjectScores[key] / subjectCounts[key])
      }

      // Calculate trend (compare last 5 exams to previous 5)
      let trend: "up" | "down" | "stable" = "stable"
      if (exams.length >= 6) {
        const recent5 = exams.slice(0, 5).reduce((sum, e) => sum + e.score, 0) / 5
        const previous5 = exams.slice(5, 10).reduce((sum, e) => sum + e.score, 0) / Math.min(5, exams.length - 5)
        if (recent5 > previous5 + 5) trend = "up"
        else if (recent5 < previous5 - 5) trend = "down"
      }

      return {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        profilePicture: student.profilePicture,
        totalExams,
        averageScore,
        passRate,
        trend,
        lastActive: exams[0]?.completedAt || null,
        subjectScores,
      }
    })

    // Sort
    processedStudents.sort((a, b) => {
      switch (sortBy) {
        case "score":
          return (b.averageScore || 0) - (a.averageScore || 0)
        case "exams":
          return b.totalExams - a.totalExams
        case "recent":
          if (!a.lastActive) return 1
          if (!b.lastActive) return -1
          return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
        case "name":
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
        default:
          return 0
      }
    })

    return NextResponse.json({ students: processedStudents })
  } catch (error) {
    console.error("Progress error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
