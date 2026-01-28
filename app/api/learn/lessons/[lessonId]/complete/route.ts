import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params
    const { courseId, progressData } = await request.json()

    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const session = await verifyToken(token)
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    // Update or create lesson progress
    await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId: session.userId,
          lessonId,
        },
      },
      update: {
        isCompleted: true,
        completedAt: new Date(),
        progressData: progressData || undefined,
      },
      create: {
        userId: session.userId,
        lessonId,
        isCompleted: true,
        completedAt: new Date(),
        progressData: progressData || undefined,
      },
    })

    // Update course enrollment
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId,
        },
      },
    })

    if (enrollment && !enrollment.completedLessons.includes(lessonId)) {
      const updatedCompletedLessons = [...enrollment.completedLessons, lessonId]
      
      // Check if course is complete
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          modules: {
            include: {
              lessons: { select: { id: true } },
            },
          },
        },
      })

      const totalLessons = course?.modules.reduce((acc, m) => acc + m.lessons.length, 0) || 0
      const isCompleted = updatedCompletedLessons.length >= totalLessons

      await prisma.courseEnrollment.update({
        where: { id: enrollment.id },
        data: {
          completedLessons: updatedCompletedLessons,
          isCompleted,
          completedAt: isCompleted ? new Date() : undefined,
          lastAccessedAt: new Date(),
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to complete lesson:", error)
    return NextResponse.json({ error: "Failed to complete lesson" }, { status: 500 })
  }
}
