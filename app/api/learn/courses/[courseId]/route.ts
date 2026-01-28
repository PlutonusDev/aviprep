import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value
    const session = token ? await verifyToken(token) : null

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                title: true,
                description: true,
                contentType: true,
                estimatedMins: true,
                order: true,
              },
            },
          },
        },
      },
    })

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Calculate totals
    const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0)

    // Get enrollment if user is logged in
    let enrollment = null
    if (session?.userId) {
      enrollment = await prisma.courseEnrollment.findUnique({
        where: {
          userId_courseId: {
            userId: session.userId,
            courseId: course.id,
          },
        },
      })
    }

    const completedLessons = enrollment?.completedLessons || []
    const progress = totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0

    return NextResponse.json({
      course: {
        ...course,
        totalLessons,
        progress,
        isEnrolled: !!enrollment,
        completedLessons,
      },
    })
  } catch (error) {
    console.error("Failed to fetch course:", error)
    return NextResponse.json({ error: "Failed to fetch course" }, { status: 500 })
  }
}
