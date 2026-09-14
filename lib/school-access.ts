import { prisma } from "@lib/prisma"
import { SUBJECTS } from "@lib/subjects"

/**
 * Subject access for a student, combining every route they can have it by.
 *
 * A school grants access in two ways - directly to a student, or to a group
 * they belong to. Those are resolved at read time rather than materialised as
 * Purchase rows, so adding a student to a group takes effect immediately and
 * removing them cannot leave orphaned access behind.
 */

export interface AccessSources {
  /** Bought outright, or covered by a bundle. */
  purchased: string[]
  /** Granted by the school directly to this student. */
  individual: string[]
  /** Granted by the school to a group this student is in. */
  group: string[]
  hasBundle: boolean
}

export async function getSchoolGrantedSubjectIds(userId: string): Promise<{
  individual: string[]
  group: string[]
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { schoolSubjectIds: true, flightSchoolId: true },
  })

  if (!user) return { individual: [], group: [] }

  const individual = user.schoolSubjectIds ?? []

  // Only groups belonging to the student's own school count, so a stale
  // membership from a previous school cannot grant anything.
  const groups = user.flightSchoolId
    ? await prisma.studentGroup.findMany({
        where: { flightSchoolId: user.flightSchoolId, studentIds: { has: userId } },
        select: { subjectIds: true },
      })
    : []

  const group = Array.from(new Set(groups.flatMap((g) => g.subjectIds ?? [])))

  return { individual, group }
}

/**
 * Every subject id the student may open, from all sources at once.
 * `bundleActive` and the purchase list come from the caller so this stays a
 * single extra query rather than refetching the user.
 */
export async function resolveAccessibleSubjectIds({
  userId,
  purchasedSubjectIds,
  hasActiveBundle,
  allSubjectIds,
}: {
  userId: string
  purchasedSubjectIds: string[]
  hasActiveBundle: boolean
  allSubjectIds: string[]
}): Promise<Set<string>> {
  if (hasActiveBundle) return new Set(allSubjectIds)

  const { individual, group } = await getSchoolGrantedSubjectIds(userId)
  return new Set([...purchasedSubjectIds, ...individual, ...group])
}

/** Keeps unknown ids out of the grant lists. */
export function sanitiseSubjectIds(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const valid = new Set(SUBJECTS.map((s) => s.id))
  return Array.from(new Set(input.filter((v): v is string => typeof v === "string" && valid.has(v))))
}
