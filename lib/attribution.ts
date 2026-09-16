import "server-only"

import { prisma } from "@lib/prisma"

/**
 * Who students see credited on a question, lesson or course: the curator who
 * wrote it, then anyone whose edit was approved with credit (ContentCredit),
 * in the order they contributed. Curators who chose to stay anonymous, and
 * admins, are left out. Minor edits never add a name.
 */

export type CreditedType = "question" | "lesson" | "course"

export interface Contributor {
  id: string
  name: string
  avatar: string | null
}

const key = (type: CreditedType, id: string) => `${type}:${id}`

async function contributorsFor(targets: { type: CreditedType; id: string; authorId: string | null }[]) {
  const result = new Map<string, Contributor[]>()
  if (!targets.length) return result

  const credits = await prisma.contentCredit.findMany({
    where: { OR: (["question", "lesson", "course"] as const).map((type) => ({ contentType: type, contentId: { in: targets.filter((t) => t.type === type).map((t) => t.id) } })) },
    orderBy: { createdAt: "asc" },
    select: { contentType: true, contentId: true, curatorId: true },
  })

  const people = new Set<string>([...targets.map((t) => t.authorId).filter(Boolean), ...credits.map((c) => c.curatorId)] as string[])
  const curators = people.size
    ? await prisma.curator.findMany({
        where: { id: { in: [...people] } },
        select: { id: true, firstName: true, lastName: true, profilePicture: true, anonymous: true },
      })
    : []
  const shown = new Map(
    curators.filter((c) => c.anonymous !== true).map((c) => [c.id, { id: c.id, name: `${c.firstName} ${c.lastName}`.trim(), avatar: c.profilePicture ?? null }]),
  )

  const creditsByContent = new Map<string, string[]>()
  for (const c of credits) {
    const k = key(c.contentType as CreditedType, c.contentId)
    creditsByContent.set(k, [...(creditsByContent.get(k) ?? []), c.curatorId])
  }

  for (const t of targets) {
    const k = key(t.type, t.id)
    const ids = [t.authorId, ...(creditsByContent.get(k) ?? [])].filter((id): id is string => !!id)
    const list: Contributor[] = []
    for (const id of ids) {
      const person = shown.get(id)
      if (person && !list.some((p) => p.id === id)) list.push(person)
    }
    result.set(k, list)
  }
  return result
}

/** Credits for many questions at once, keyed by question id. */
export async function questionContributors(questions: { id: string; authorId: string | null }[]) {
  const map = await contributorsFor(questions.map((q) => ({ type: "question" as const, id: q.id, authorId: q.authorId })))
  return new Map(questions.map((q) => [q.id, map.get(key("question", q.id)) ?? []]))
}

export async function lessonContributors(lesson: { id: string; authorId: string | null }) {
  return (await contributorsFor([{ type: "lesson", id: lesson.id, authorId: lesson.authorId }])).get(key("lesson", lesson.id)) ?? []
}

/** A course credits everyone behind it: its author and edits, then each lesson's, in course order. */
export async function courseContributors(course: {
  id: string
  authorId: string | null
  lessons: { id: string; authorId: string | null }[]
}) {
  const map = await contributorsFor([
    { type: "course", id: course.id, authorId: course.authorId },
    ...course.lessons.map((l) => ({ type: "lesson" as const, id: l.id, authorId: l.authorId })),
  ])
  const list: Contributor[] = []
  for (const k of [key("course", course.id), ...course.lessons.map((l) => key("lesson", l.id))]) {
    for (const person of map.get(k) ?? []) if (!list.some((p) => p.id === person.id)) list.push(person)
  }
  return list
}
