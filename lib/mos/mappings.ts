import "server-only"

import { prisma } from "@lib/prisma"
import { ITEM_SUMMARY_SELECT, subjectUnitNumbers } from "@lib/mos/library"
import type { MosLink, MosLinkInput } from "@lib/mos/subjects"

export type MosContentType = "question" | "lesson"

export const MOS_PUBLISH_ERROR = "Add a primary MOS item before publishing."
export const MOS_LIVE_REMOVE_ERROR = "Live content needs a primary MOS item. Pick another one first."

const OBJECT_ID = /^[a-f0-9]{24}$/i
const MAX_LINKS = 20

/**
 * Reads `mos` from a save payload. Undefined means "not sent, leave mappings
 * alone". Otherwise returns a clean list with exactly one primary.
 */
export function parseMosInput(raw: unknown): MosLinkInput[] | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const links: MosLinkInput[] = []
  for (const entry of raw.slice(0, MAX_LINKS)) {
    const itemId = typeof entry?.itemId === "string" ? entry.itemId : ""
    if (!OBJECT_ID.test(itemId) || seen.has(itemId)) continue
    seen.add(itemId)
    const confidence = typeof entry.confidence === "number" && entry.confidence >= 0 && entry.confidence <= 1 ? entry.confidence : null
    links.push({
      itemId,
      primary: entry.primary === true,
      source: entry.source === "suggested" ? "suggested" : "manual",
      confidence,
      ...(entry.reviewed === true ? { reviewed: true } : {}),
    })
  }
  if (links.length) {
    const primary = Math.max(0, links.findIndex((l) => l.primary))
    links.forEach((l, i) => (l.primary = i === primary))
  }
  return links
}

/**
 * New links must point at current items in the subject's units. Links the
 * content already has are allowed through even if a MOS update has since
 * removed or moved their item - they're in the review queue, and editing
 * something else about the question mustn't force a re-map first.
 */
export async function checkLinksForSubject(links: MosLinkInput[], subjectId: string, alreadyLinked: string[] = []): Promise<string | null> {
  const kept = new Set(alreadyLinked)
  const fresh = links.filter((l) => !kept.has(l.itemId))
  if (!fresh.length) return null
  const units = await subjectUnitNumbers(subjectId)
  if (!units.length) return "This subject has no MOS units loaded."
  const items = await prisma.mosItem.findMany({
    where: { id: { in: fresh.map((l) => l.itemId) } },
    select: { id: true, unitNumber: true, retired: true },
  })
  if (items.length !== fresh.length) return "A linked MOS item no longer exists. Remove it and try again."
  if (items.some((i) => !units.includes(i.unitNumber))) return "That MOS item belongs to a different subject."
  if (items.some((i) => i.retired)) return "That MOS item is no longer in the MOS. Pick a current one."
  return null
}

/** Item ids a question or lesson is linked to right now. */
export async function linkedItemIds(contentType: MosContentType, contentId: string) {
  const rows = await prisma.mosMapping.findMany({ where: { contentType, contentId }, select: { itemId: true } })
  return rows.map((r) => r.itemId)
}

export async function hasPrimaryMapping(contentType: MosContentType, contentId: string) {
  return (await withPrimaryMapping(contentType, [contentId])).has(contentId)
}

/**
 * Of these ids, the ones with a primary mapping to a current item. A primary
 * whose item a MOS update removed doesn't count: the content needs re-mapping.
 */
export async function withPrimaryMapping(contentType: MosContentType, contentIds: string[]) {
  if (!contentIds.length) return new Set<string>()
  const rows = await prisma.mosMapping.findMany({
    where: { contentType, contentId: { in: contentIds }, primary: true },
    select: { contentId: true, itemId: true },
  })
  if (!rows.length) return new Set<string>()
  const retired = await prisma.mosItem.findMany({
    where: { id: { in: [...new Set(rows.map((r) => r.itemId))] }, retired: true },
    select: { id: true },
  })
  const gone = new Set(retired.map((r) => r.id))
  return new Set(rows.filter((r) => !gone.has(r.itemId)).map((r) => r.contentId))
}

export async function mappingsFor(contentType: MosContentType, contentId: string): Promise<MosLink[]> {
  const rows = await prisma.mosMapping.findMany({ where: { contentType, contentId }, orderBy: { createdAt: "asc" } })
  if (!rows.length) return []
  const items = await prisma.mosItem.findMany({ where: { id: { in: rows.map((r) => r.itemId) } }, select: ITEM_SUMMARY_SELECT })
  const byId = new Map(items.map((i) => [i.id, i]))
  return rows
    .filter((r) => byId.has(r.itemId))
    .sort((a, b) => Number(b.primary) - Number(a.primary))
    .map((r) => ({
      itemId: r.itemId,
      primary: r.primary,
      source: r.source === "suggested" ? "suggested" : "manual",
      confidence: r.confidence ?? null,
      item: byId.get(r.itemId),
      needsReview: !!r.needsReview,
      reviewReason: r.reviewReason === "removed" ? "removed" : r.reviewReason === "reworded" ? "reworded" : null,
      reviewNote: r.reviewNote ?? null,
    }))
}

/** Replaces a question's or lesson's links with `links`. */
export async function saveMappings({
  contentType,
  contentId,
  subjectId,
  links,
  userId,
}: {
  contentType: MosContentType
  contentId: string
  subjectId: string
  links: MosLinkInput[]
  userId: string
}) {
  const existing = await prisma.mosMapping.findMany({ where: { contentType, contentId } })
  const wanted = new Map(links.map((l) => [l.itemId, l]))

  const remove = existing.filter((e) => !wanted.has(e.itemId)).map((e) => e.id)
  if (remove.length) await prisma.mosMapping.deleteMany({ where: { id: { in: remove } } })

  const byItem = new Map(existing.map((e) => [e.itemId, e]))
  for (const link of links) {
    const current = byItem.get(link.itemId)
    if (current) {
      // "Still fits" in the editor clears a flag left by a MOS update.
      const confirm = link.reviewed && current.needsReview && current.reviewReason !== "removed"
      if (current.primary !== link.primary || current.subjectId !== subjectId || confirm) {
        await prisma.mosMapping.update({
          where: { id: current.id },
          data: { primary: link.primary, subjectId, ...(confirm ? reviewCleared(userId) : {}) },
        })
      }
    } else {
      await prisma.mosMapping.create({
        data: {
          itemId: link.itemId,
          contentType,
          contentId,
          subjectId,
          primary: link.primary,
          source: link.source,
          confidence: link.confidence ?? null,
          createdById: userId,
        },
      })
    }
  }
}

export async function deleteMappingsFor(contentType: MosContentType, contentIds: string[]) {
  if (!contentIds.length) return
  await prisma.mosMapping.deleteMany({ where: { contentType, contentId: { in: contentIds } } })
}

const reviewCleared = (userId: string) => ({
  needsReview: false,
  reviewReason: null,
  reviewNote: null,
  suggestedItemIds: [],
  reviewedById: userId,
  reviewedAt: new Date(),
})

export type ReviewAction = "confirm" | "move" | "remove"

/**
 * Resolves a link flagged by a MOS update.
 *   confirm  the reworded item still fits
 *   move     re-point the link at another current item (usually a suggestion)
 *   remove   drop the link
 * Returns an error message, or null.
 */
export async function reviewMapping(mappingId: string, action: ReviewAction, userId: string, targetItemId?: string): Promise<string | null> {
  const mapping = await prisma.mosMapping.findUnique({ where: { id: mappingId } })
  if (!mapping) return "That link no longer exists."

  if (action === "confirm") {
    const item = await prisma.mosItem.findUnique({ where: { id: mapping.itemId }, select: { retired: true } })
    if (!item || item.retired) return "That item is no longer in the MOS. Move or remove the link."
    await prisma.mosMapping.update({ where: { id: mappingId }, data: reviewCleared(userId) })
    return null
  }

  const siblings = await prisma.mosMapping.findMany({
    where: { contentType: mapping.contentType, contentId: mapping.contentId, id: { not: mappingId } },
  })

  if (action === "move") {
    if (!targetItemId || !OBJECT_ID.test(targetItemId)) return "Pick an item to move the link to."
    const error = await checkLinksForSubject([{ itemId: targetItemId, primary: false, source: "manual" }], mapping.subjectId)
    if (error) return error
    const existing = siblings.find((m) => m.itemId === targetItemId)
    if (existing) {
      // Already linked to the target: fold this link into that one.
      await prisma.mosMapping.delete({ where: { id: mappingId } })
      await prisma.mosMapping.update({
        where: { id: existing.id },
        data: mapping.primary ? { primary: true } : {},
      })
      return null
    }
    await prisma.mosMapping.update({
      where: { id: mappingId },
      data: { itemId: targetItemId, source: "manual", confidence: null, createdById: userId, ...reviewCleared(userId) },
    })
    return null
  }

  // remove
  await prisma.mosMapping.delete({ where: { id: mappingId } })
  if (mapping.primary && siblings.length) {
    const current = await withCurrentItems(siblings.map((m) => m.itemId))
    const next = siblings.find((m) => current.has(m.itemId))
    if (next) await prisma.mosMapping.update({ where: { id: next.id }, data: { primary: true } })
  }
  return null
}

async function withCurrentItems(itemIds: string[]) {
  const items = await prisma.mosItem.findMany({
    where: { id: { in: itemIds }, OR: [{ retired: false }, { retired: null }, { retired: { isSet: false } }] },
    select: { id: true },
  })
  return new Set(items.map((i) => i.id))
}
