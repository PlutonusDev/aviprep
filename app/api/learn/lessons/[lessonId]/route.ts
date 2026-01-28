import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")

    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const session = await verifyToken(token)
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    // Fetch the lesson
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    })

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    // Fetch the full course structure for navigation
    const course = await prisma.course.findUnique({
      where: { id: courseId || lesson.module.courseId },
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                title: true,
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

    // Get enrollment
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId: course.id,
        },
      },
    })

    // Auto-enroll if not enrolled
    if (!enrollment) {
      await prisma.courseEnrollment.create({
        data: {
          userId: session.userId,
          courseId: course.id,
          completedLessons: [],
        },
      })
    }

    const completedLessons = enrollment?.completedLessons || []
    const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0)
    const progress = totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0

    // Update last accessed
    if (enrollment) {
      await prisma.courseEnrollment.update({
        where: { id: enrollment.id },
        data: { lastAccessedAt: new Date() },
      })
    }

    return NextResponse.json({
      lesson: {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        contentType: lesson.contentType,
        content: lesson.content,
        estimatedMins: lesson.estimatedMins,
        order: lesson.order,
      },
      course: {
        id: course.id,
        title: course.title,
        modules: course.modules,
        completedLessons,
        totalLessons,
        progress,
      },
    })
  } catch (error) {
    console.error("Failed to fetch lesson:", error)
    return NextResponse.json({ error: "Failed to fetch lesson" }, { status: 500 })
  }
}
