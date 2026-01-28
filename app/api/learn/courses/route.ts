import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"
import { getSubjectsByLicense, type LicenseType } from "@lib/subjects"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const licenseType = (searchParams.get("license") || "cpl") as LicenseType
    
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value
    const session = token ? await verifyToken(token) : null
    
    // Get subjects for this license type
    const subjects = getSubjectsByLicense(licenseType)
    const subjectIds = subjects.map(s => s.id)
    
    // Fetch courses for these subjects
    const courses = await prisma.course.findMany({
      where: {
        subjectId: { in: subjectIds },
        isPublished: true,
      },
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
              select: { id: true },
            },
          },
        },
        _count: {
          select: { modules: true },
        },
      },
      orderBy: { order: "asc" },
    })

    // If user is logged in, get their enrollment data
    let enrollments: Record<string, { completedLessons: string[] }> = {}
    if (session?.userId) {
      const userEnrollments = await prisma.courseEnrollment.findMany({
        where: {
          userId: session.userId,
          courseId: { in: courses.map(c => c.id) },
        },
      })
      enrollments = Object.fromEntries(
        userEnrollments.map(e => [e.courseId, { completedLessons: e.completedLessons }])
      )
    }

    // Calculate total lessons and progress for each course
    const coursesWithProgress = courses.map(course => {
      const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0)
      const enrollment = enrollments[course.id]
      const completedLessons = enrollment?.completedLessons.length || 0
      const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

      return {
        id: course.id,
        subjectId: course.subjectId,
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail,
        estimatedHours: course.estimatedHours,
        difficulty: course.difficulty,
        isPublished: course.isPublished,
        modules: course.modules,
        _count: course._count,
        totalLessons,
        progress,
        isEnrolled: !!enrollment,
        completedLessons,
      }
    })

    return NextResponse.json({ courses: coursesWithProgress })
  } catch (error) {
    console.error("Failed to fetch courses:", error)
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 })
  }
}
