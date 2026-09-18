import "server-only"

import { prisma } from "@lib/prisma"

/**
 * Whether a curator has actually worked on a course.
 *
 * The course shells are created in advance by AviPrep, so authoring the course
 * record means nothing on its own - almost every course is "authored" by an
 * admin. What counts is having written or edited a lesson inside it, or having
 * been the one who created the course in the first place.
 *
 * Without this, any curator could send someone else's untouched course for
 * review, and a reviewer would have no idea whose work they were looking at.
 */

/** A lesson is theirs if they wrote it, proposed an edit to it, or were sent one back. */
const byCurator = (curatorId: string) => ({
  OR: [{ authorId: curatorId }, { pendingRevisionById: curatorId }, { rejectionForId: curatorId }],
})

export async function hasContributed(courseId: string, curatorId: string): Promise<boolean> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { authorId: true, submittedById: true, pendingRevisionById: true },
  })
  if (!course) return false
  if (course.authorId === curatorId || course.submittedById === curatorId || course.pendingRevisionById === curatorId) {
    return true
  }

  const lessons = await prisma.lesson.count({
    where: { module: { courseId }, ...byCurator(curatorId) },
  })
  return lessons > 0
}

/**
 * The same question for a list of courses, in two queries rather than two per
 * course. Used to decide which cards show a submit button.
 */
export async function contributedCourseIds(courseIds: string[], curatorId: string): Promise<Set<string>> {
  if (!courseIds.length) return new Set()

  const [own, lessons] = await Promise.all([
    prisma.course.findMany({
      where: {
        id: { in: courseIds },
        OR: [{ authorId: curatorId }, { submittedById: curatorId }, { pendingRevisionById: curatorId }],
      },
      select: { id: true },
    }),
    prisma.lesson.findMany({
      where: { module: { courseId: { in: courseIds } }, ...byCurator(curatorId) },
      select: { module: { select: { courseId: true } } },
    }),
  ])

  return new Set([...own.map((c) => c.id), ...lessons.map((l) => l.module.courseId)])
}
