import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { isResponse, pick, requireStaff } from "@lib/staff"

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
  return NextResponse.json({ course, role: staff.role })
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
    const course = await prisma.course.update({ where: { id: courseId }, data: { reviewStatus: "review" } })
    return NextResponse.json({ course })
  }

  if (body.action === "apply-revision" || body.action === "discard-revision") {
    if (!staff.isAdmin) return NextResponse.json({ error: "Only an admin can review changes." }, { status: 403 })
    const revision = (existing.pendingRevision ?? {}) as Record<string, unknown>
    const course = await prisma.course.update({
      where: { id: courseId },
      data: {
        ...(body.action === "apply-revision" ? pick(revision, DETAIL_FIELDS) : {}),
        pendingRevision: null,
        pendingRevisionById: null,
        pendingRevisionAt: null,
      },
    })
    return NextResponse.json({ course })
  }

  if (!staff.isAdmin) {
    if (Object.keys(pick(body, ADMIN_FIELDS)).length > 0) {
      return NextResponse.json({ error: "Only an admin can publish or change course settings." }, { status: 403 })
    }
    const details = pick(body, DETAIL_FIELDS)
    if (existing.isPublished) {
      // Live: hold the change for an admin rather than touching what students see.
      const merged = { ...((existing.pendingRevision as Record<string, unknown>) ?? {}), ...details }
      const course = await prisma.course.update({
        where: { id: courseId },
        data: { pendingRevision: merged, pendingRevisionById: staff.userId, pendingRevisionAt: new Date() },
      })
      return NextResponse.json({ course, revisionPending: true })
    }
    const course = await prisma.course.update({ where: { id: courseId }, data: details })
    return NextResponse.json({ course })
  }

  // Admin. Publishing also closes out any review request.
  const data: Record<string, unknown> = { ...pick(body, DETAIL_FIELDS), ...pick(body, ADMIN_FIELDS) }
  if (body.isPublished === true) data.reviewStatus = null
  const course = await prisma.course.update({ where: { id: courseId }, data })
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
