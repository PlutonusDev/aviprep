import { type NextRequest, NextResponse } from "next/server"
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
const clearRejection = { rejectionReason: null, rejectedAt: null, rejectionForId: null }

/** Admin feedback shown to the curator on their home screen. */
const readReason = (value: unknown) => (typeof value === "string" ? value.trim().slice(0, 1000) : "")
const REASON_MIN = 10

/** Royalty points: 3 marks a complex question, anything else is standard. */
const readPoints = (value: unknown) => (value === 3 ? 3 : value === 1 ? 1 : undefined)

/**
 * Curators:
 *   - draft / in-review question: edit directly; status can be draft or review
 *   - live question: the edit is stored as a proposed revision; students keep
 *     seeing the published version until an admin applies it
 * Admins: edit and publish directly (with { points: 1 | 3 }), or
 *   { action: "apply-revision" }
 *   { action: "discard-revision", reason? }  proposed edit declined, reason shown to the curator
 *   { action: "send-back", reason }          in-review question returned to draft with feedback
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const { id } = await params
  const body = await request.json()
  const existing = await prisma.question.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Question not found" }, { status: 404 })

  try {
    if (body.action === "send-back") {
      if (!staff.isAdmin) return NextResponse.json({ error: "Only an admin can review questions." }, { status: 403 })
      if (effectiveStatus(existing.status) === "published") {
        return NextResponse.json({ error: "This question is live. Discard its proposed changes instead." }, { status: 400 })
      }
      const reason = readReason(body.reason)
      if (reason.length < REASON_MIN) {
        return NextResponse.json({ error: "Tell them what to change, in a sentence or two.", fieldErrors: { reason: "Add a reason." } }, { status: 422 })
      }
      const question = await prisma.question.update({
        where: { id },
        data: { status: "draft", rejectionReason: reason, rejectedAt: new Date(), rejectionForId: existing.authorId, reviewedById: staff.userId },
      })
      return NextResponse.json(question)
    }

    if (body.action === "apply-revision" || body.action === "discard-revision") {
      if (!staff.isAdmin) return NextResponse.json({ error: "Only an admin can review changes." }, { status: 403 })
      if (!existing.pendingRevision) return NextResponse.json({ error: "No proposed changes." }, { status: 400 })
      const reason = readReason(body.reason)
      const question = await prisma.question.update({
        where: { id },
        data:
          body.action === "apply-revision"
            ? { ...contentFrom(existing.pendingRevision as Record<string, unknown>), reviewedById: staff.userId, ...clearRevision, ...clearRejection }
            : {
                ...clearRevision,
                ...(reason
                  ? { rejectionReason: reason, rejectedAt: new Date(), rejectionForId: existing.pendingRevisionById }
                  : clearRejection),
              },
      })
      return NextResponse.json(question)
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
        await saveMos()
        return NextResponse.json({ ...question, revisionPending: true })
      }

      const status = body.status === "review" ? "review" : "draft"
      const question = await prisma.question.update({
        where: { id },
        data: { ...contentFrom(body), status, authorNote: body.authorNote ?? undefined, ...(status === "review" ? clearRejection : {}) },
      })
      await saveMos()
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
