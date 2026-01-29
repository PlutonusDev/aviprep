import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"
import { notifyCourseEnrolled } from "@lib/notifications"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const session = await verifyToken(token)
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    })

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId,
        },
      },
    })

    // Create or update enrollment
    const enrollment = await prisma.courseEnrollment.upsert({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId,
        },
      },
      update: {
        lastAccessedAt: new Date(),
      },
      create: {
        userId: session.userId,
        courseId,
        completedLessons: [],
      },
    })

    // Send notification only if this is a new enrollment
    if (!existingEnrollment) {
      await notifyCourseEnrolled(session.userId, course.title, courseId).catch(err =>
        console.error("Failed to send enrollment notification:", err)
      )
    }

    return NextResponse.json({ enrollment })
  } catch (error) {
    console.error("Failed to enroll:", error)
    return NextResponse.json({ error: "Failed to enroll" }, { status: 500 })
  }
}
