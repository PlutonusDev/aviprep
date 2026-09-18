import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@lib/prisma"
import { isResponse, pick, requireStaff } from "@lib/staff"
import { lessonsMissingPrimary } from "@lib/mos/coverage"
import { withPrimaryMapping } from "@lib/mos/mappings"
import { decide, logEvent } from "@lib/review/review"

const clearRejection = { rejectionReason: null, rejectedAt: null, rejectionForId: null, changesRequestedAt: null }

/** Descriptive fields anyone on the content team may edit. */
const DETAIL_FIELDS = ["title", "description", "estimatedHours", "difficulty"] as const
/** Admin-only: presentation and go-live. */
const ADMIN_FIELDS = ["order", "thumbnail", "isPublished", "subjectId"] as const

export async function GET(_request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const { courseId } = await params
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } },
      ...(staff.isAdmin ? { _count: { select: { enrollments: true } } } : {}),
    },
  })

  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })
  const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id))
  const mapped = await withPrimaryMapping("lesson", lessonIds)
  return NextResponse.json({ course, role: staff.role, mosUnmappedLessonIds: lessonIds.filter((id) => !mapped.has(id)) })
}

/**
 * Curators:
 *   - unpublished course: edit details directly, or { action: "submit" } for review
 *   - live course: detail edits are held as a proposed revision
 * Admins additionally: publish/unpublish, order, artwork, and
 *   { action: "apply-revision" | "discard-revision" }.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const { courseId } = await params
  const body = await request.json()
  const existing = await prisma.course.findUnique({ where: { id: courseId } })
  if (!existing) return NextResponse.json({ error: "Course not found" }, { status: 404 })

  if (body.action === "submit") {
    if (existing.isPublished) return NextResponse.json({ error: "This course is already live." }, { status: 400 })
    if (existing.reviewStatus === "review") {
      return NextResponse.json({ error: "It's already with a reviewer." }, { status: 400 })
    }

    // An empty course costs a reviewer a round trip to say the obvious.
    const lessons = await prisma.lesson.count({ where: { module: { courseId } } })
    if (lessons === 0) {
      return NextResponse.json({ error: "Add at least one lesson before submitting." }, { status: 400 })
    }

    const course = await prisma.course.update({
      where: { id: courseId },
      data: { reviewStatus: "review", submittedById: staff.userId, submittedAt: new Date(), ...clearRejection },
    })
    await logEvent({ contentType: "course", contentId: courseId, kind: "new", action: "submitted", staff, message: body.note })
    return NextResponse.json({ course })
  }

  if (body.action === "apply-revision" || body.action === "discard-revision") {
    if (!existing.pendingRevision) return NextResponse.json({ error: "No proposed changes." }, { status: 400 })
    const result = await decide({
      type: "course",
      id: courseId,
      action: body.action === "apply-revision" ? "approve" : "reject",
      message: body.reason,
      staff,
    })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({ course: await prisma.course.findUnique({ where: { id: courseId } }) })
  }

  if (!staff.isAdmin) {
    if (Object.keys(pick(body, ADMIN_FIELDS)).length > 0) {
      return NextResponse.json({ error: "Only an admin can publish or change course settings." }, { status: 403 })
    }
    const details = pick(body, DETAIL_FIELDS)
    if (existing.isPublished) {
      // Live: hold the change for an admin rather than touching what students see.
      const merged = { ...((existing.pendingRevision as Record<string, unknown>) ?? {}), ...details } as unknown as Prisma.InputJsonObject
      const course = await prisma.course.update({
        where: { id: courseId },
        data: { pendingRevision: merged, pendingRevisionById: staff.userId, pendingRevisionAt: new Date(), ...clearRejection },
      })
      await logEvent({ contentType: "course", contentId: courseId, kind: "edit", action: "submitted", staff })
      return NextResponse.json({ course, revisionPending: true })
    }
    const course = await prisma.course.update({ where: { id: courseId }, data: details })
    return NextResponse.json({ course })
  }

  // Admin. Publishing also closes out any review request.
  const data: Record<string, unknown> = { ...pick(body, DETAIL_FIELDS), ...pick(body, ADMIN_FIELDS) }
  if (body.isPublished === true) Object.assign(data, { reviewStatus: null, ...clearRejection })
  if (body.isPublished === true && !existing.isPublished) {
    const missing = await lessonsMissingPrimary(courseId)
    if (missing.length) {
      const names = missing.slice(0, 3).map((l) => `"${l.title}"`).join(", ")
      const more = missing.length > 3 ? ` and ${missing.length - 3} more` : ""
      return NextResponse.json(
        {
          error: `Link every lesson to a MOS item first. Still to do: ${names}${more}.`,
          mosUnmappedLessonIds: missing.map((l) => l.id),
        },
        { status: 422 },
      )
    }
  }
  const course = await prisma.course.update({ where: { id: courseId }, data })
  if (body.isPublished === true && !existing.isPublished && existing.reviewStatus === "review") {
    await logEvent({ contentType: "course", contentId: courseId, kind: "new", action: "approved", staff })
  }
  return NextResponse.json({ course })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const { courseId } = await params
  if (!staff.isAdmin) {
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { isPublished: true } })
    if (course?.isPublished) {
      return NextResponse.json({ error: "Only an admin can delete a live course." }, { status: 403 })
    }
  }

  await prisma.course.delete({ where: { id: courseId } })
  return NextResponse.json({ success: true })
}
