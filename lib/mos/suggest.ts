import "server-only"

import { embed } from "ai"
import { prisma } from "@lib/prisma"
import { EMBEDDING_MODEL, ITEM_SUMMARY_SELECT, dot, normalise, vectorsForSubject } from "@lib/mos/library"

/**
 * Cosine similarity from text-embedding-3-small sits in a narrow band: related
 * aviation text lands around 0.45-0.7, unrelated text around 0.1-0.3. Stretching
 * that band to 0-100% gives curators a number that separates a strong match from
 * a weak one. It's a ranking aid, not a probability.
 */
const FLOOR = 0.2
const CEILING = 0.65

export function confidenceFromSimilarity(similarity: number) {
  return Math.max(0, Math.min(1, (similarity - FLOOR) / (CEILING - FLOOR)))
}

export async function suggestItems(subjectId: string, text: string, limit = 5, exclude: string[] = []) {
  const vectors = await vectorsForSubject(subjectId)
  if (!vectors.length) return []

  const { embedding } = await embed({ model: EMBEDDING_MODEL, value: text })
  const query = normalise(embedding)
  const skip = new Set(exclude)

  const ranked = vectors
    .filter((v) => !skip.has(v.id))
    .map((v) => ({ id: v.id, similarity: dot(query, v.vector) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)

  const items = await prisma.mosItem.findMany({ where: { id: { in: ranked.map((r) => r.id) } }, select: ITEM_SUMMARY_SELECT })
  const byId = new Map(items.map((i) => [i.id, i]))

  return ranked
    .filter((r) => byId.has(r.id))
    .map((r) => ({ item: byId.get(r.id)!, confidence: Math.round(confidenceFromSimilarity(r.similarity) * 100) / 100 }))
}
