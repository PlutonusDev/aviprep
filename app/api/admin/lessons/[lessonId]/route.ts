import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@lib/prisma"
import { courseIsLive, isResponse, liveContentError, pick, requireStaff } from "@lib/staff"

const LESSON_FIELDS = ["title", "description", "contentType", "content", "estimatedMins"] as const

export async function GET(_request: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const { lessonId } = await params
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: true } } },
  })
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 })

  return NextResponse.json({ lesson, role: staff.role, isLive: lesson.module.course.isPublished })
}

/**
 * Curators on a live course: saves go into pendingRevision for an admin.
 * Otherwise saves apply directly. Admins also get
 * { action: "apply-revision" | "discard-revision" }.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const { lessonId } = await params
  const body = await request.json()
  const existing = await prisma.lesson.findUnique({ where: { id: lessonId } })
  if (!existing) return NextResponse.json({ error: "Lesson not found" }, { status: 404 })

  if (body.action === "apply-revision" || body.action === "discard-revision") {
    if (!staff.isAdmin) return NextResponse.json({ error: "Only an admin can review changes." }, { status: 403 })
    const revision = (existing.pendingRevision ?? {}) as Record<string, unknown>
    const lesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        ...(body.action === "apply-revision" ? (pick(revision, LESSON_FIELDS) as Prisma.LessonUpdateInput) : {}),
        pendingRevision: null,
        pendingRevisionById: null,
        pendingRevisionAt: null,
      },
    })
    return NextResponse.json({ lesson })
  }

  const changes = pick(body, LESSON_FIELDS) as Prisma.LessonUpdateInput

  if (!staff.isAdmin && (await courseIsLive({ lessonId }))) {
    const merged = { ...((existing.pendingRevision as Record<string, unknown>) ?? {}), ...changes } as unknown as Prisma.InputJsonObject
    const lesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: { pendingRevision: merged, pendingRevisionById: staff.userId, pendingRevisionAt: new Date() },
    })
    return NextResponse.json({ lesson, revisionPending: true })
  }

  const lesson = await prisma.lesson.update({ where: { id: lessonId }, data: changes })
  return NextResponse.json({ lesson })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const { lessonId } = await params
  if (!staff.isAdmin && (await courseIsLive({ lessonId }))) return liveContentError()

  await prisma.lesson.delete({ where: { id: lessonId } })
  return NextResponse.json({ success: true })
}
