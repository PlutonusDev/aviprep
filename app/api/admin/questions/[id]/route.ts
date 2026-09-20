import { type NextRequest, NextResponse, after } from "next/server"
import { prisma } from "@lib/prisma"
import { isResponse, requireStaff } from "@lib/staff"
import { effectiveStatus, validateQuestion, isValid } from "@lib/question-validation"
import {
  MOS_LIVE_REMOVE_ERROR,
  MOS_PUBLISH_ERROR,
  checkLinksForSubject,
  deleteMappingsFor,
  hasPrimaryMapping,
  linkedItemIds,
  parseMosInput,
  saveMappings,
} from "@lib/mos/mappings"
import { decide, logEvent } from "@lib/review/review"
import { reviewSubmission } from "@lib/review/ai-reviewer"
import { answerTypeOf } from "@lib/exam/marking"

const CONTENT_FIELDS = [
  "subjectId",
  "topic",
  "difficulty",
  "questionText",
  "imageUrl",
  "imageAlt",
  "answerType",
  "options",
  "correctIndex",
  "answerValue",
  "answerUnit",
  "tolerance",
  "toleranceType",
  "explanation",
  "reference",
] as const

/** Numbers arrive as strings from a form; anything unreadable is simply absent. */
const numberOrNull = (value: unknown) => {
  const n = typeof value === "string" ? Number(value.trim()) : typeof value === "number" ? value : NaN
  return Number.isFinite(n) ? n : null
}

function contentFrom(source: Record<string, unknown>) {
  return {
    subjectId: source.subjectId as string,
    topic: source.topic as string,
    difficulty: source.difficulty as string,
    questionText: source.questionText as string,
    imageUrl: (source.imageUrl as string) || null,
    imageAlt: (source.imageAlt as string) || null,
    answerType: answerTypeOf(source as { answerType?: string | null }),
    options: (source.options as string[]) ?? [],
    correctIndex: (source.correctIndex as number) ?? null,
    answerValue: numberOrNull(source.answerValue),
    answerUnit: (source.answerUnit as string)?.trim() || null,
    tolerance: numberOrNull(source.tolerance),
    toleranceType: source.toleranceType === "absolute" ? "absolute" : "percent",
    explanation: source.explanation as string,
    // Previously omitted on edit, which silently wiped the citation.
    reference: (source.reference as string) || "",
  }
}

const clearRejection = { rejectionReason: null, rejectedAt: null, rejectionForId: null, changesRequestedAt: null }

/** Royalty points: 3 marks a complex question, anything else is standard. */
const readPoints = (value: unknown) => (value === 3 ? 3 : value === 1 ? 1 : undefined)

/**
 * Curators:
 *   - draft / in-review question: edit directly; status can be draft or review
 *   - live question: the edit is stored as a proposed revision; students keep
 *     seeing the published version until an admin applies it
 * Admins: edit and publish directly (with { points: 1 | 3 }), or the editor's
 * shortcuts into the review workflow (lib/review/review.ts):
 *   { action: "apply-revision" }             approve a proposed edit
 *   { action: "discard-revision", reason? }  reject it
 *   { action: "send-back", reason }          ask for changes to a question in review
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const { id } = await params
  const body = await request.json()
  const existing = await prisma.question.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Question not found" }, { status: 404 })

  try {
    const shortcut = { "send-back": "request-changes", "apply-revision": "approve", "discard-revision": "reject" } as const
    if (body.action in shortcut) {
      if (body.action === "send-back" && existing.status !== "review") {
        return NextResponse.json({ error: "Only a question in review can be sent back." }, { status: 400 })
      }
      if (body.action !== "send-back" && !existing.pendingRevision) {
        return NextResponse.json({ error: "No proposed changes." }, { status: 400 })
      }
      const result = await decide({ type: "question", id, action: shortcut[body.action as keyof typeof shortcut], message: body.reason, staff })
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
      return NextResponse.json(await prisma.question.findUnique({ where: { id } }))
    }

    const errors = validateQuestion(body)
    if (!isValid(errors)) {
      return NextResponse.json({ error: "This question is not ready to save.", fieldErrors: errors }, { status: 422 })
    }

    const isLive = effectiveStatus(existing.status) === "published"

    // MOS links apply straight away, even when the content edit waits for review:
    // they don't change what students see, and each one is a human decision on record.
    const mos = parseMosInput(body.mos)
    const mosError = mos ? await checkLinksForSubject(mos, body.subjectId, await linkedItemIds("question", id)) : null
    if (mosError) return NextResponse.json({ error: mosError, fieldErrors: { mos: mosError } }, { status: 422 })
    if (mos && !mos.length && isLive && (await hasPrimaryMapping("question", id))) {
      return NextResponse.json({ error: MOS_LIVE_REMOVE_ERROR, fieldErrors: { mos: MOS_LIVE_REMOVE_ERROR } }, { status: 422 })
    }
    const publishing = staff.isAdmin && body.status === "published" && !isLive
    if (publishing && !(mos ? mos.some((l) => l.primary) : await hasPrimaryMapping("question", id))) {
      return NextResponse.json({ error: MOS_PUBLISH_ERROR, fieldErrors: { mos: MOS_PUBLISH_ERROR } }, { status: 422 })
    }
    const saveMos = async () => {
      if (mos) await saveMappings({ contentType: "question", contentId: id, subjectId: body.subjectId, links: mos, userId: staff.userId })
    }

    if (!staff.isAdmin) {
      if (isLive) {
        const proposal = Object.fromEntries(CONTENT_FIELDS.map((f) => [f, body[f]]))
        const question = await prisma.question.update({
          where: { id },
          data: {
            pendingRevision: { ...contentFrom(proposal), authorNote: body.authorNote ?? null },
            pendingRevisionById: staff.userId,
            pendingRevisionAt: new Date(),
            // A fresh proposal answers any earlier feedback.
            ...clearRejection,
          },
        })
        await logEvent({ contentType: "question", contentId: id, kind: "edit", action: "submitted", staff, message: body.authorNote })
        await saveMos()
        after(() => reviewSubmission(id, "edit"))
        return NextResponse.json({ ...question, revisionPending: true })
      }

      const status = body.status === "review" ? "review" : "draft"
      const question = await prisma.question.update({
        where: { id },
        data: { ...contentFrom(body), status, authorNote: body.authorNote ?? undefined, ...(status === "review" ? clearRejection : {}) },
      })
      await saveMos()
      if (status === "review" && existing.status !== "review") {
        await logEvent({ contentType: "question", contentId: id, kind: "new", action: "submitted", staff, message: body.authorNote })
        // After saveMos, so the reviewer sees the links the curator just made.
        after(() => reviewSubmission(id, "new"))
      }
      return NextResponse.json(question)
    }

    const question = await prisma.question.update({
      where: { id },
      data: {
        ...contentFrom(body),
        status: body.status || undefined,
        authorNote: body.authorNote ?? undefined,
        reviewedById: body.status === "published" ? staff.userId : undefined,
        points: readPoints(body.points),
        ...(body.status === "published" ? clearRejection : {}),
      },
    })
    // Publishing from the editor settles a pending review the same way the review page does.
    if (body.status === "published" && existing.status === "review") {
      await logEvent({ contentType: "question", contentId: id, kind: "new", action: "approved", staff })
    }
    await saveMos()
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
    await deleteMappingsFor("question", [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete question:", error)
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 })
  }
}
