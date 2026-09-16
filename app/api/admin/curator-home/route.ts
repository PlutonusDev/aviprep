import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { isResponse, requireStaff } from "@lib/staff"
import { estimateRoyalties } from "@lib/curators/royalties"

const liveQuestion = { OR: [{ status: "published" }, { status: null }, { status: { isSet: false } }] }
/** On MongoDB, `null` doesn't match a field that was never written. */
const unset = (field: string) => ({ OR: [{ [field]: null }, { [field]: { isSet: false } }] })

const snippet = (text: string, max = 110) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text)

/** Royalties are paid within 14 days of month end (Contractor Agreement 3.7). */
function payoutDate(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth() + 1, 14)
}

type Outcome = "changes-requested" | "rejected" | "edit-rejected"

/** A curator's own numbers for their home screen. */
export async function GET() {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff
  if (staff.isAdmin) return NextResponse.json({ error: "This is the curator home." }, { status: 403 })

  const me = staff.userId
  const [
    curator,
    live,
    review,
    draft,
    pendingQuestionEdits,
    feedbackQuestions,
    myLessons,
    pendingLessons,
    feedbackLessons,
    pendingCourses,
    feedbackCourses,
    royalties,
  ] = await Promise.all([
    prisma.curator.findUnique({ where: { id: me }, select: { firstName: true, credentials: true, createdAt: true } }),
    prisma.question.count({ where: { authorId: me, ...liveQuestion } }),
    prisma.question.findMany({
      where: { authorId: me, status: "review" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, subjectId: true, questionText: true, updatedAt: true },
    }),
    prisma.question.count({ where: { authorId: me, status: "draft" } }),
    prisma.question.findMany({
      where: { pendingRevisionById: me, ...unset("changesRequestedAt") },
      orderBy: { pendingRevisionAt: "desc" },
      select: { id: true, subjectId: true, questionText: true, pendingRevisionAt: true },
    }),
    prisma.question.findMany({
      where: { rejectionForId: me, rejectionReason: { not: null } },
      orderBy: { rejectedAt: "desc" },
      take: 20,
      select: { id: true, subjectId: true, questionText: true, rejectionReason: true, rejectedAt: true, status: true, changesRequestedAt: true },
    }),
    prisma.lesson.findMany({
      where: { authorId: me },
      select: { module: { select: { course: { select: { isPublished: true } } } } },
    }),
    prisma.lesson.findMany({
      where: { pendingRevisionById: me, ...unset("changesRequestedAt") },
      orderBy: { pendingRevisionAt: "desc" },
      select: { id: true, title: true, pendingRevisionAt: true, module: { select: { courseId: true } } },
    }),
    prisma.lesson.findMany({
      where: { rejectionForId: me, rejectionReason: { not: null } },
      orderBy: { rejectedAt: "desc" },
      take: 20,
      select: { id: true, title: true, rejectionReason: true, rejectedAt: true, changesRequestedAt: true, module: { select: { courseId: true } } },
    }),
    prisma.course.findMany({
      where: {
        OR: [
          { submittedById: me, reviewStatus: "review", isPublished: false },
          { pendingRevisionById: me, ...unset("changesRequestedAt") },
        ],
      },
      select: { id: true, title: true, reviewStatus: true, isPublished: true, submittedAt: true, pendingRevisionAt: true, pendingRevisionById: true },
    }),
    prisma.course.findMany({
      where: { rejectionForId: me, rejectionReason: { not: null } },
      orderBy: { rejectedAt: "desc" },
      take: 20,
      select: { id: true, title: true, rejectionReason: true, rejectedAt: true, reviewStatus: true, changesRequestedAt: true },
    }),
    estimateRoyalties(me),
  ])

  if (!curator) return NextResponse.json({ error: "Account not found." }, { status: 404 })

  const questionHref = (q: { id: string; subjectId: string }) => `/admin/questions?subject=${encodeURIComponent(q.subjectId)}&edit=${q.id}`
  const lessonHref = (l: { id: string; module: { courseId: string } }) => `/admin/courses/${l.module.courseId}/lesson/${l.id}`
  const courseHref = (c: { id: string }) => `/admin/courses/${c.id}`

  const questionOutcome = (q: (typeof feedbackQuestions)[number]): Outcome =>
    q.status === "rejected" ? "rejected" : q.status === "draft" || q.changesRequestedAt ? "changes-requested" : "edit-rejected"
  const courseOutcome = (c: (typeof feedbackCourses)[number]): Outcome =>
    c.reviewStatus === "rejected" ? "rejected" : c.reviewStatus === "changes" || c.changesRequestedAt ? "changes-requested" : "edit-rejected"

  const feedback = [
    ...feedbackQuestions.map((q) => ({
      kind: "question" as const,
      id: q.id,
      title: snippet(q.questionText),
      reason: q.rejectionReason!,
      at: q.rejectedAt,
      outcome: questionOutcome(q),
      href: questionHref(q),
    })),
    ...feedbackLessons.map((l) => ({
      kind: "lesson" as const,
      id: l.id,
      title: l.title,
      reason: l.rejectionReason!,
      at: l.rejectedAt,
      outcome: (l.changesRequestedAt ? "changes-requested" : "edit-rejected") as Outcome,
      href: lessonHref(l),
    })),
    ...feedbackCourses.map((c) => ({
      kind: "course" as const,
      id: c.id,
      title: c.title,
      reason: c.rejectionReason!,
      at: c.rejectedAt,
      outcome: courseOutcome(c),
      href: courseHref(c),
    })),
  ].sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0))

  const inReview = [
    ...review.map((q) => ({ kind: "question" as const, id: q.id, title: snippet(q.questionText), at: q.updatedAt, change: "new" as const, href: questionHref(q) })),
    ...pendingQuestionEdits.map((q) => ({
      kind: "question" as const,
      id: q.id,
      title: snippet(q.questionText),
      at: q.pendingRevisionAt,
      change: "edit" as const,
      href: questionHref(q),
    })),
    ...pendingLessons.map((l) => ({ kind: "lesson" as const, id: l.id, title: l.title, at: l.pendingRevisionAt, change: "edit" as const, href: lessonHref(l) })),
    ...pendingCourses.map((c) => {
      const isNew = !c.isPublished && c.reviewStatus === "review"
      return {
        kind: "course" as const,
        id: c.id,
        title: c.title,
        at: isNew ? c.submittedAt : c.pendingRevisionAt,
        change: isNew ? ("new" as const) : ("edit" as const),
        href: courseHref(c),
      }
    }),
  ].sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0))

  return NextResponse.json({
    curator,
    royalties,
    payoutDate: payoutDate(),
    questions: { live, review: review.length, draft },
    lessons: {
      live: myLessons.filter((l) => l.module.course.isPublished).length,
      total: myLessons.length,
    },
    pending: inReview.length,
    inReview: inReview.slice(0, 10),
    feedback,
  })
}
