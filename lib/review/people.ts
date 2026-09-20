import "server-only"

import { prisma } from "@lib/prisma"

/**
 * Staff ids point at two collections: admins are Users, curators are Curators.
 * This resolves either into one shape for attribution.
 */

export interface Person {
  id: string
  name: string
  email: string | null
  role: "admin" | "curator" | "ai"
  /** Curator credentials (lib/curators/details.ts); empty for admins. */
  credentials: string[]
}

/**
 * AviPrep Intelligence, the automated first read of a submitted question
 * (lib/review/ai-reviewer.ts). A reserved id, so its comments attribute like
 * anyone else's without ever colliding with a real User or Curator.
 */
export const AI_ACTOR_ID = "000000000000000000000000"

export const AI_PERSON: Person = {
  id: AI_ACTOR_ID,
  name: "AviPrep Intelligence",
  email: null,
  role: "ai",
  credentials: [],
}

const OBJECT_ID = /^[a-f0-9]{24}$/i

export async function resolvePeople(ids: (string | null | undefined)[]): Promise<Map<string, Person>> {
  const unique = Array.from(new Set(ids.filter((id): id is string => !!id && OBJECT_ID.test(id))))
  const people = new Map<string, Person>()
  if (unique.includes(AI_ACTOR_ID)) people.set(AI_ACTOR_ID, AI_PERSON)
  if (!unique.length) return people

  const [curators, users] = await Promise.all([
    prisma.curator.findMany({
      where: { id: { in: unique } },
      select: { id: true, firstName: true, lastName: true, email: true, credentials: true },
    }),
    prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, firstName: true, lastName: true, email: true } }),
  ])

  for (const c of curators) {
    people.set(c.id, { id: c.id, name: `${c.firstName} ${c.lastName}`.trim(), email: c.email, role: "curator", credentials: c.credentials })
  }
  for (const u of users) {
    if (!people.has(u.id)) {
      people.set(u.id, { id: u.id, name: `${u.firstName} ${u.lastName}`.trim(), email: u.email, role: "admin", credentials: [] })
    }
  }
  return people
}
