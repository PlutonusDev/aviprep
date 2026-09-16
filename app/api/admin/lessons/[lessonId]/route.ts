import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@lib/prisma"
import { courseIsLive, isResponse, liveContentError, pick, requireStaff } from "@lib/staff"
import { MOS_LIVE_REMOVE_ERROR, checkLinksForSubject, deleteMappingsFor, hasPrimaryMapping, linkedItemIds, parseMosInput, saveMappings } from "@lib/mos/mappings"

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
    // A reason on a discard is shown to the curator on their home screen.
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : ""
    const declined = body.action === "discard-revision" && reason
    const lesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        ...(body.action === "apply-revision" ? (pick(revision, LESSON_FIELDS) as Prisma.LessonUpdateInput) : {}),
        pendingRevision: null,
        pendingRevisionById: null,
        pendingRevisionAt: null,
        ...(declined
          ? { rejectionReason: reason, rejectedAt: new Date(), rejectionForId: existing.pendingRevisionById }
          : { rejectionReason: null, rejectedAt: null, rejectionForId: null }),
      },
    })
    return NextResponse.json({ lesson })
  }

  const changes = pick(body, LESSON_FIELDS) as Prisma.LessonUpdateInput
  const live = await courseIsLive({ lessonId })

  // MOS links apply straight away, even when a curator's content edit waits for review.
  const mos = parseMosInput(body.mos)
  if (mos) {
    const course = await prisma.module.findUnique({ where: { id: existing.moduleId }, select: { course: { select: { subjectId: true } } } })
    const subjectId = course?.course.subjectId ?? ""
    const mosError = await checkLinksForSubject(mos, subjectId, await linkedItemIds("lesson", lessonId))
    if (mosError) return NextResponse.json({ error: mosError }, { status: 422 })
    if (!mos.length && live && (await hasPrimaryMapping("lesson", lessonId))) {
      return NextResponse.json({ error: MOS_LIVE_REMOVE_ERROR }, { status: 422 })
    }
    await saveMappings({ contentType: "lesson", contentId: lessonId, subjectId, links: mos, userId: staff.userId })
  }

  if (!staff.isAdmin && live) {
    if (!Object.keys(changes).length) return NextResponse.json({ lesson: existing })
    const merged = { ...((existing.pendingRevision as Record<string, unknown>) ?? {}), ...changes } as unknown as Prisma.InputJsonObject
    const lesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        pendingRevision: merged,
        pendingRevisionById: staff.userId,
        pendingRevisionAt: new Date(),
        // A fresh proposal answers any earlier feedback.
        rejectionReason: null,
        rejectedAt: null,
        rejectionForId: null,
      },
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
  await deleteMappingsFor("lesson", [lessonId])
  return NextResponse.json({ success: true })
}
