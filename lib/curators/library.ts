import "server-only"

import { prisma } from "@lib/prisma"
import { SUBJECTS } from "@lib/subjects"

/**
 * Everything one curator has put their name to: questions, lessons and the
 * courses they built, whatever state each is in.
 *
 * It includes work they didn't start but did change, because an edit waiting on
 * an admin is still theirs to chase. `mine` tells the two apart.
 */

export type LibraryType = "question" | "lesson" | "course"

/**
 * live      - students can see it
 * review    - waiting on an admin
 * changes   - an admin sent it back
 * draft     - not submitted
 * rejected  - declined
 */
export type LibraryState = "live" | "review" | "changes" | "draft" | "rejected"

export interface LibraryItem {
  type: LibraryType
  id: string
  title: string
  /** Topic, or the course and module a lesson sits in. */
  context: string
  subjectId: string
  subjectCode: string
  state: LibraryState
  /** Royalty points, once an admin has set them. */
  points: number | null
  /** They've proposed a change to live content and it's waiting on an admin. */
  pendingEdit: boolean
  /** The last thing an admin said, when it needs their attention. */
  feedback: string | null
  updatedAt: string
  editHref: string
  /** False when it's someone else's work that they edited. */
  mine: boolean
}

const subject = (id: string) => SUBJECTS.find((s) => s.id === id)

/** Matches an id the way Mongo needs: a field never written isn't null. */
const authoredBy = (curatorId: string) => ({
  OR: [{ authorId: curatorId }, { pendingRevisionById: curatorId }, { rejectionForId: curatorId }],
})

const iso = (value: Date | null | undefined) => (value ?? new Date(0)).toISOString()

export async function curatorLibrary(curatorId: string): Promise<LibraryItem[]> {
  const [questions, lessons, courses] = await Promise.all([
    prisma.question.findMany({
      where: authoredBy(curatorId),
      select: {
        id: true, subjectId: true, topic: true, questionText: true, status: true, points: true,
        authorId: true, rejectionReason: true, changesRequestedAt: true,
        pendingRevisionById: true, pendingRevisionAt: true, updatedAt: true,
      },
    }),
    prisma.lesson.findMany({
      where: authoredBy(curatorId),
      select: {
        id: true, title: true, authorId: true, rejectionReason: true,
        pendingRevisionById: true, pendingRevisionAt: true, updatedAt: true,
        module: { select: { title: true, course: { select: { id: true, title: true, subjectId: true, isPublished: true } } } },
      },
    }),
    prisma.course.findMany({
      where: { OR: [{ authorId: curatorId }, { submittedById: curatorId }, { pendingRevisionById: curatorId }, { rejectionForId: curatorId }] },
      select: {
        id: true, title: true, subjectId: true, isPublished: true, reviewStatus: true, authorId: true,
        rejectionReason: true, pendingRevisionById: true, pendingRevisionAt: true, updatedAt: true,
        _count: { select: { modules: true } },
      },
    }),
  ])

  const items: LibraryItem[] = []

  for (const q of questions) {
    // A missing status reads as published: the bank predates the field.
    const status = q.status ?? "published"
    const live = status === "published"
    const pendingEdit = live && q.pendingRevisionById === curatorId
    items.push({
      type: "question",
      id: q.id,
      title: q.questionText,
      context: q.topic,
      subjectId: q.subjectId,
      subjectCode: subject(q.subjectId)?.code ?? q.subjectId,
      state: live ? "live" : status === "review" ? "review" : status === "rejected" ? "rejected" : q.changesRequestedAt ? "changes" : "draft",
      points: q.points ?? (live ? 1 : null),
      pendingEdit,
      feedback: q.rejectionReason,
      updatedAt: iso(q.pendingRevisionAt ?? q.updatedAt),
      editHref: `/admin/questions?subject=${q.subjectId}&edit=${q.id}`,
      mine: q.authorId === curatorId,
    })
  }

  for (const l of lessons) {
    const course = l.module?.course
    const live = !!course?.isPublished
    items.push({
      type: "lesson",
      id: l.id,
      title: l.title,
      context: [course?.title, l.module?.title].filter(Boolean).join(" · "),
      subjectId: course?.subjectId ?? "",
      subjectCode: subject(course?.subjectId ?? "")?.code ?? "",
      // A lesson has no state of its own: it's live once its course is.
      state: live ? "live" : l.rejectionReason ? "changes" : "draft",
      points: live ? 10 : null,
      pendingEdit: live && l.pendingRevisionById === curatorId,
      feedback: l.rejectionReason,
      updatedAt: iso(l.pendingRevisionAt ?? l.updatedAt),
      editHref: course ? `/admin/courses/${course.id}/lesson/${l.id}` : "/admin/courses",
      mine: l.authorId === curatorId,
    })
  }

  for (const c of courses) {
    items.push({
      type: "course",
      id: c.id,
      title: c.title,
      context: `${c._count.modules} module${c._count.modules === 1 ? "" : "s"}`,
      subjectId: c.subjectId,
      subjectCode: subject(c.subjectId)?.code ?? c.subjectId,
      state: c.isPublished
        ? "live"
        : c.reviewStatus === "review"
          ? "review"
          : c.reviewStatus === "rejected"
            ? "rejected"
            : c.reviewStatus === "changes"
              ? "changes"
              : "draft",
      points: null,
      pendingEdit: c.isPublished && c.pendingRevisionById === curatorId,
      feedback: c.rejectionReason,
      updatedAt: iso(c.pendingRevisionAt ?? c.updatedAt),
      editHref: `/admin/courses/${c.id}`,
      mine: c.authorId === curatorId,
    })
  }

  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/** The tallies behind the filter chips. */
export function libraryCounts(items: LibraryItem[]) {
  const counts = { all: items.length, live: 0, review: 0, changes: 0, draft: 0, rejected: 0, edits: 0 }
  for (const item of items) {
    counts[item.state] += 1
    if (item.pendingEdit) counts.edits += 1
  }
  return counts
}
