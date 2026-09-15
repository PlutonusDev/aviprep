import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { isResponse, requireStaff } from "@lib/staff"
import { effectiveStatus, validateQuestion, isValid } from "@lib/question-validation"

const CONTENT_FIELDS = ["subjectId", "topic", "difficulty", "questionText", "options", "correctIndex", "explanation", "reference"] as const

function contentFrom(source: Record<string, unknown>) {
  return {
    subjectId: source.subjectId as string,
    topic: source.topic as string,
    difficulty: source.difficulty as string,
    questionText: source.questionText as string,
    options: source.options as string[],
    correctIndex: source.correctIndex as number,
    explanation: source.explanation as string,
    // Previously omitted on edit, which silently wiped the citation.
    reference: (source.reference as string) || "",
  }
}

const clearRevision = { pendingRevision: null, pendingRevisionById: null, pendingRevisionAt: null }

/**
 * Curators:
 *   - draft / in-review question: edit directly; status can be draft or review
 *   - live question: the edit is stored as a proposed revision; students keep
 *     seeing the published version until an admin applies it
 * Admins: edit and publish directly, or { action: "apply-revision" | "discard-revision" }.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const { id } = await params
  const body = await request.json()
  const existing = await prisma.question.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Question not found" }, { status: 404 })

  try {
    if (body.action === "apply-revision" || body.action === "discard-revision") {
      if (!staff.isAdmin) return NextResponse.json({ error: "Only an admin can review changes." }, { status: 403 })
      if (!existing.pendingRevision) return NextResponse.json({ error: "No proposed changes." }, { status: 400 })
      const question = await prisma.question.update({
        where: { id },
        data:
          body.action === "apply-revision"
            ? { ...contentFrom(existing.pendingRevision as Record<string, unknown>), reviewedById: staff.userId, ...clearRevision }
            : clearRevision,
      })
      return NextResponse.json(question)
    }

    const errors = validateQuestion(body)
    if (!isValid(errors)) {
      return NextResponse.json({ error: "This question is not ready to save.", fieldErrors: errors }, { status: 422 })
    }

    const isLive = effectiveStatus(existing.status) === "published"

    if (!staff.isAdmin) {
      if (isLive) {
        const proposal = Object.fromEntries(CONTENT_FIELDS.map((f) => [f, body[f]]))
        const question = await prisma.question.update({
          where: { id },
          data: {
            pendingRevision: { ...contentFrom(proposal), authorNote: body.authorNote ?? null },
            pendingRevisionById: staff.userId,
            pendingRevisionAt: new Date(),
          },
        })
        return NextResponse.json({ ...question, revisionPending: true })
      }

      const status = body.status === "review" ? "review" : "draft"
      const question = await prisma.question.update({
        where: { id },
        data: { ...contentFrom(body), status, authorNote: body.authorNote ?? undefined },
      })
      return NextResponse.json(question)
    }

    const question = await prisma.question.update({
      where: { id },
      data: {
        ...contentFrom(body),
        status: body.status || undefined,
        authorNote: body.authorNote ?? undefined,
        reviewedById: body.status === "published" ? staff.userId : undefined,
      },
    })
    return NextResponse.json(question)
  } catch (error) {
    console.error("Failed to update question:", error)
    return NextResponse.json({ error: "Failed to update question" }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const { id } = await params

  try {
    if (!staff.isAdmin) {
      const question = await prisma.question.findUnique({ where: { id }, select: { status: true } })
      if (question && effectiveStatus(question.status) === "published") {
        return NextResponse.json({ error: "Only an admin can remove a live question." }, { status: 403 })
      }
    }
    await prisma.question.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete question:", error)
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 })
  }
}
