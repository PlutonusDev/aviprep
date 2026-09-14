import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@lib/auth"
import { prisma } from "@lib/prisma"
import { getSubjectById } from "@lib/subjects"

/**
 * Everything the dashboard needs to answer "where was I?" in one request:
 * the course last opened (and the exact lesson to resume), the last exam sat,
 * and the weakest topic worth attacking next.
 */
export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = await verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const userId = payload.userId

    const [enrollment, lastAttempt, weakPoint] = await Promise.all([
      prisma.courseEnrollment.findFirst({
        where: { userId, isCompleted: false },
        orderBy: { lastAccessedAt: "desc" },
        include: {
          course: {
            include: {
              modules: {
                orderBy: { order: "asc" },
                include: { lessons: { orderBy: { order: "asc" } } },
              },
            },
          },
        },
      }),
      prisma.examAttempt.findFirst({
        where: { userId },
        orderBy: { completedAt: "desc" },
      }),
      prisma.weakPoint.findFirst({
        where: { userId, questionsAttempted: { gt: 0 } },
        orderBy: { accuracy: "asc" },
      }),
    ])

    let course = null
    if (enrollment?.course) {
      const lessons = enrollment.course.modules.flatMap((m) => m.lessons)
      const done = new Set(enrollment.completedLessons)
      // Resume at the first lesson not yet completed, not simply the first one.
      const next = lessons.find((l) => !done.has(l.id)) ?? lessons[0] ?? null

      course = {
        courseId: enrollment.course.id,
        title: enrollment.course.title,
        subjectId: enrollment.course.subjectId,
        subjectName: getSubjectById(enrollment.course.subjectId)?.name ?? null,
        thumbnail: enrollment.course.thumbnail,
        totalLessons: lessons.length,
        completedLessons: done.size,
        progress: lessons.length > 0 ? Math.round((done.size / lessons.length) * 100) : 0,
        lastAccessedAt: enrollment.lastAccessedAt,
        nextLesson: next ? { id: next.id, title: next.title } : null,
      }
    }

    return NextResponse.json({
      course,
      lastExam: lastAttempt
        ? {
            subjectId: lastAttempt.subjectId,
            subjectName: lastAttempt.subjectName,
            score: lastAttempt.score,
            passed: lastAttempt.passed,
            completedAt: lastAttempt.completedAt,
          }
        : null,
      weakPoint: weakPoint
        ? {
            topic: weakPoint.topic,
            subjectId: weakPoint.subjectId,
            subjectName: weakPoint.subjectName,
            accuracy: weakPoint.accuracy,
            priority: weakPoint.priority,
          }
        : null,
    })
  } catch (error) {
    console.error("Failed to build continue payload:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
