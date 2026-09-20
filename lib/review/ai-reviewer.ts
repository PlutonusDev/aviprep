import "server-only"

import { generateText, Output } from "ai"
import { prisma } from "@lib/prisma"
import { mappingsFor } from "@lib/mos/mappings"
import { AI_ACTOR_ID } from "./people"
import { MODEL, SYSTEM, buildPrompt, tidyComment, verdictSchema, type MosForReview, type QuestionForReview, type Verdict } from "./ai-rubric"

/**
 * AviPrep Intelligence: an automated first read of every question a curator
 * submits, measured against the FAA Aviation Instructor's Handbook Appendix B
 * and AviPrep's own content guidelines (lib/review/data/rubric.json, rebuilt by
 * scripts/build-review-rubric.ts).
 *
 * It leaves one short comment on the review thread and nothing else. It cannot
 * approve, reject or send work back: this module only ever writes a ReviewEvent,
 * so no code path exists for it to change a question's status. A human makes
 * every decision.
 *
 * Two outcomes:
 *   ai-comment  it read the question and had nothing serious to raise.
 *   ai-flagged  the writing breaks a rule in one of the two documents. The item
 *               stays in the admin queue, marked so nobody approves it on a
 *               glance.
 *
 * Doubt about the MOS mapping never flags. The suggestions a curator links from
 * are themselves approximate, so a second guess about them belongs in the
 * comment, not in a request for changes.
 */

/* --- The review ------------------------------------------------------------- */

/**
 * Reads a submitted question and leaves its comment. Safe to call and forget:
 * it never throws, and a failure leaves the thread as it was rather than
 * posting an apology nobody can act on.
 */
export async function reviewSubmission(questionId: string, kind: "new" | "edit"): Promise<Verdict | null> {
  try {
    const row = await prisma.question.findUnique({ where: { id: questionId } })
    if (!row) return null

    // An edit is reviewed as the curator proposed it, not as it stands live.
    const proposed = (kind === "edit" && (row.pendingRevision as Record<string, unknown> | null)) || {}
    const question = { ...row, ...proposed } as unknown as QuestionForReview

    const links = await mappingsFor("question", questionId)
    const mos: MosForReview[] = links
      .filter((l) => l.item)
      .map((l) => ({ ref: `${l.item!.unitCode} ${l.item!.ref}`, primary: l.primary, text: l.item!.fullText }))

    const { output } = await generateText({
      model: MODEL,
      output: Output.object({ schema: verdictSchema }),
      system: SYSTEM,
      prompt: buildPrompt(question, mos),
    })

    const comment = tidyComment(output.comment)
    if (!comment) return null

    await prisma.reviewEvent.create({
      data: {
        contentType: "question",
        contentId: questionId,
        kind,
        action: output.writing === "needs-work" ? "ai-flagged" : "ai-comment",
        actorId: AI_ACTOR_ID,
        actorRole: "ai",
        message: comment,
      },
    })
    return { ...output, comment }
  } catch (error) {
    console.error("AviPrep Intelligence couldn't review question", questionId, error)
    return null
  }
}
