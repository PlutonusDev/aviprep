import { prisma } from "@lib/prisma"
import { effectiveStatus } from "@lib/question-validation"

export interface SubjectCounts {
  total: number
  draft: number
  review: number
  published: number
}

/**
 * Real bank sizes straight from the question collection.
 *
 * Deliberately NOT `groupBy`: Prisma's MongoDB connector panics
 * (`Option::unwrap()` on `None`, aggregate.rs) when a group key is missing from
 * the documents, and `status` is absent on every question written before the
 * authoring workflow existed. Selecting two scalar fields and tallying in JS is
 * unconditionally safe, and the payload is tiny even for a large bank.
 *
 * `RawSubject.totalQuestions` in lib/subjects.ts is a catalogue figure - what a
 * subject is *meant* to contain - so it must not be used anywhere that claims to
 * report what a student can actually practise.
 */
export async function getQuestionCountsBySubject(): Promise<Record<string, SubjectCounts>> {
  const rows = await prisma.question.findMany({
    select: { subjectId: true, status: true },
  })

  const counts: Record<string, SubjectCounts> = {}

  for (const row of rows) {
    if (!row.subjectId) continue
    const entry = counts[row.subjectId] ?? { total: 0, draft: 0, review: 0, published: 0 }
    entry.total += 1
    entry[effectiveStatus(row.status)] += 1
    counts[row.subjectId] = entry
  }

  return counts
}

/** Only published questions can appear in a practice exam. */
export async function getPublishedCountsBySubject(): Promise<Record<string, number>> {
  const counts = await getQuestionCountsBySubject()
  return Object.fromEntries(Object.entries(counts).map(([id, c]) => [id, c.published]))
}
