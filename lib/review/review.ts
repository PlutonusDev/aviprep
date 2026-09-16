import "server-only"

import { Prisma } from "@prisma/client"
import { prisma } from "@lib/prisma"
import type { Staff } from "@lib/staff"
import { SUBJECTS } from "@lib/subjects"
import { effectiveStatus } from "@lib/question-validation"
import { htmlToText, sanitizeHtml } from "@lib/sanitize-html"
import { hasPrimaryMapping, mappingsFor, MOS_PUBLISH_ERROR, withPrimaryMapping } from "@lib/mos/mappings"
import { lessonsMissingPrimary } from "@lib/mos/coverage"
import { resolvePeople, type Person } from "./people"

/**
 * Content review: one place that knows what's waiting for an admin, what each
 * item looks like, and what approving, rejecting or asking for changes does.
 * The review page and the editors all go through here, so they can't disagree.
 *
 * Two kinds of review:
 * - new:  unpublished content submitted by its author (a question in review,
 *         or a course submitted to go live).
 * - edit: a curator's proposed change to live content (pendingRevision), which
 *         students don't see until it's approved.
 */

export type ContentType = "question" | "lesson" | "course"
export type ReviewKind = "new" | "edit"
export type ReviewAction = "approve" | "request-changes" | "reject" | "comment"
export type EventAction = "submitted" | "comment" | "approved" | "changes-requested" | "rejected"

export const CONTENT_TYPES: ContentType[] = ["question", "lesson", "course"]
export const MESSAGE_MAX = 2000

export const QUESTION_FIELDS = ["subjectId", "topic", "difficulty", "questionText", "options", "correctIndex", "explanation", "reference"] as const
export const LESSON_FIELDS = ["title", "description", "contentType", "content", "estimatedMins"] as const
export const COURSE_FIELDS = ["title", "description", "estimatedHours", "difficulty"] as const

const FIELD_LABELS: Record<string, string> = {
  subjectId: "Subject",
  topic: "Topic",
  difficulty: "Difficulty",
  questionText: "Question",
  options: "Options",
  correctIndex: "Correct answer",
  explanation: "Explanation",
  reference: "Reference",
  title: "Title",
  description: "Description",
  contentType: "Lesson type",
  content: "Content",
  estimatedMins: "Minutes",
  estimatedHours: "Hours",
}

/** On MongoDB, `null` doesn't match a field that was never written. */
const unset = (field: string) => ({ OR: [{ [field]: null }, { [field]: { isSet: false } }] })

const subjectName = (id: string) => SUBJECTS.find((s) => s.id === id)?.name ?? id
const snippet = (text: string, max = 140) => (text && text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text ?? "")

export function questionContent(source: Record<string, unknown>) {
  return {
    subjectId: source.subjectId as string,
    topic: source.topic as string,
    difficulty: source.difficulty as string,
    questionText: source.questionText as string,
    options: source.options as string[],
    correctIndex: source.correctIndex as number,
    explanation: source.explanation as string,
    reference: (source.reference as string) || "",
  }
}

const pick = (source: Record<string, unknown>, fields: readonly string[]) =>
  Object.fromEntries(fields.filter((f) => source[f] !== undefined).map((f) => [f, source[f]]))

/* --- Timeline ------------------------------------------------------------------ */

export async function logEvent({
  contentType,
  contentId,
  kind,
  action,
  staff,
  message,
}: {
  contentType: ContentType
  contentId: string
  kind: ReviewKind
  action: EventAction
  staff: Pick<Staff, "userId" | "role">
  message?: string | null
  /** Approved edits: points credited, or 0 for a minor edit. */
  points?: number | null
}) {
  await prisma.reviewEvent.create({
    data: {
      contentType,
      contentId,
      kind,
      action,
      actorId: staff.userId,
      actorRole: staff.role,
      message: message?.trim() || null,
      points: typeof points === "number" ? points : null,
    },
  })
}

export interface TimelineEvent {
  id: string
  kind: ReviewKind
  action: EventAction
  message: string | null
  points: number | null
  createdAt: Date
  actor: Person | null
}

export async function timeline(contentType: ContentType, contentId: string): Promise<TimelineEvent[]> {
  const events = await prisma.reviewEvent.findMany({ where: { contentType, contentId }, orderBy: { createdAt: "asc" } })
  const people = await resolvePeople(events.map((e) => e.actorId))
  return events.map((e) => ({
    id: e.id,
    kind: e.kind as ReviewKind,
    action: e.action as EventAction,
    message: e.message,
    points: e.points ?? null,
    createdAt: e.createdAt,
    actor: people.get(e.actorId) ?? null,
  }))
}

/* --- Queue ------------------------------------------------------------------------ */

export interface QueueItem {
  key: string
  type: ContentType
  kind: ReviewKind
  id: string
  title: string
  subjectId: string
  subjectName: string
  /** Topic, course title or lesson count: whatever places it. */
  context: string
  submittedAt: Date | null
  submittedBy: Person | null
  author: Person | null
  comments: number
  /** It came back after an admin asked for changes. */
  resubmitted: boolean
  /** Unpublished content missing the primary MOS link it needs to go live. */
  missingMos: boolean
}

export async function reviewQueue(): Promise<QueueItem[]> {
  const [newQuestions, questionEdits, lessonEdits, newCourses, courseEdits] = await Promise.all([
    prisma.question.findMany({
      where: { status: "review" },
      select: { id: true, subjectId: true, topic: true, questionText: true, authorId: true, updatedAt: true },
    }),
    prisma.question.findMany({
      where: { pendingRevisionAt: { not: null }, ...unset("changesRequestedAt") },
      select: { id: true, subjectId: true, topic: true, questionText: true, authorId: true, pendingRevisionById: true, pendingRevisionAt: true },
    }),
    prisma.lesson.findMany({
      where: { pendingRevisionAt: { not: null }, ...unset("changesRequestedAt") },
      select: {
        id: true,
        title: true,
        authorId: true,
        pendingRevisionById: true,
        pendingRevisionAt: true,
        module: { select: { course: { select: { title: true, subjectId: true } } } },
      },
    }),
    prisma.course.findMany({
      where: { reviewStatus: "review", isPublished: false },
      select: {
        id: true,
        title: true,
        subjectId: true,
        authorId: true,
        submittedById: true,
        submittedAt: true,
        updatedAt: true,
        modules: { select: { lessons: { select: { id: true } } } },
      },
    }),
    prisma.course.findMany({
      where: { pendingRevisionAt: { not: null }, ...unset("changesRequestedAt") },
      select: { id: true, title: true, subjectId: true, authorId: true, pendingRevisionById: true, pendingRevisionAt: true },
    }),
  ])

  const ids = [
    ...newQuestions.map((q) => q.id),
    ...questionEdits.map((q) => q.id),
    ...lessonEdits.map((l) => l.id),
    ...newCourses.map((c) => c.id),
    ...courseEdits.map((c) => c.id),
  ]
  const events = ids.length
    ? await prisma.reviewEvent.findMany({
        where: { contentId: { in: ids }, action: { in: ["comment", "changes-requested", "submitted"] } },
        select: { contentId: true, kind: true, action: true, actorId: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      })
    : []
  const stats = new Map<string, { comments: number; resubmitted: boolean; submittedBy?: string }>()
  for (const e of events) {
    const key = `${e.contentId}:${e.kind}`
    const entry = stats.get(key) ?? { comments: 0, resubmitted: false }
    if (e.action === "comment") entry.comments += 1
    if (e.action === "changes-requested") entry.resubmitted = true
    if (e.action === "submitted") entry.submittedBy = e.actorId
    stats.set(key, entry)
  }

  const allCourseLessons = newCourses.flatMap((c) => c.modules.flatMap((m) => m.lessons.map((l) => l.id)))
  const [mappedQuestions, mappedLessons] = await Promise.all([
    withPrimaryMapping("question", newQuestions.map((q) => q.id)),
    withPrimaryMapping("lesson", allCourseLessons),
  ])

  const people = await resolvePeople([
    ...newQuestions.map((q) => q.authorId),
    ...questionEdits.flatMap((q) => [q.authorId, q.pendingRevisionById]),
    ...lessonEdits.flatMap((l) => [l.authorId, l.pendingRevisionById]),
    ...newCourses.flatMap((c) => [c.authorId, c.submittedById]),
    ...courseEdits.flatMap((c) => [c.authorId, c.pendingRevisionById]),
    ...events.map((e) => e.actorId),
  ])
  const person = (id: string | null | undefined) => (id ? people.get(id) ?? null : null)
  const extra = (id: string, kind: ReviewKind) => stats.get(`${id}:${kind}`) ?? { comments: 0, resubmitted: false }

  const items: QueueItem[] = [
    ...newQuestions.map((q) => ({
      key: `question:${q.id}`,
      type: "question" as const,
      kind: "new" as const,
      id: q.id,
      title: snippet(q.questionText),
      subjectId: q.subjectId,
      subjectName: subjectName(q.subjectId),
      context: q.topic,
      submittedAt: q.updatedAt,
      submittedBy: person(extra(q.id, "new").submittedBy ?? q.authorId),
      author: person(q.authorId),
      comments: extra(q.id, "new").comments,
      resubmitted: extra(q.id, "new").resubmitted,
      missingMos: !mappedQuestions.has(q.id),
    })),
    ...questionEdits.map((q) => ({
      key: `question:${q.id}`,
      type: "question" as const,
      kind: "edit" as const,
      id: q.id,
      title: snippet(q.questionText),
      subjectId: q.subjectId,
      subjectName: subjectName(q.subjectId),
      context: q.topic,
      submittedAt: q.pendingRevisionAt,
      submittedBy: person(q.pendingRevisionById),
      author: person(q.authorId),
      comments: extra(q.id, "edit").comments,
      resubmitted: extra(q.id, "edit").resubmitted,
      missingMos: false,
    })),
    ...lessonEdits.map((l) => ({
      key: `lesson:${l.id}`,
      type: "lesson" as const,
      kind: "edit" as const,
      id: l.id,
      title: l.title,
      subjectId: l.module.course.subjectId,
      subjectName: subjectName(l.module.course.subjectId),
      context: l.module.course.title,
      submittedAt: l.pendingRevisionAt,
      submittedBy: person(l.pendingRevisionById),
      author: person(l.authorId),
      comments: extra(l.id, "edit").comments,
      resubmitted: extra(l.id, "edit").resubmitted,
      missingMos: false,
    })),
    ...newCourses.map((c) => {
      const lessonIds = c.modules.flatMap((m) => m.lessons.map((l) => l.id))
      return {
        key: `course:${c.id}`,
        type: "course" as const,
        kind: "new" as const,
        id: c.id,
        title: c.title,
        subjectId: c.subjectId,
        subjectName: subjectName(c.subjectId),
        context: `${lessonIds.length} ${lessonIds.length === 1 ? "lesson" : "lessons"}`,
        submittedAt: c.submittedAt ?? c.updatedAt,
        submittedBy: person(c.submittedById ?? c.authorId),
        author: person(c.authorId),
        comments: extra(c.id, "new").comments,
        resubmitted: extra(c.id, "new").resubmitted,
        missingMos: lessonIds.some((id) => !mappedLessons.has(id)),
      }
    }),
    ...courseEdits.map((c) => ({
      key: `course:${c.id}`,
      type: "course" as const,
      kind: "edit" as const,
      id: c.id,
      title: c.title,
      subjectId: c.subjectId,
      subjectName: subjectName(c.subjectId),
      context: "Course details",
      submittedAt: c.pendingRevisionAt,
      submittedBy: person(c.pendingRevisionById),
      author: person(c.authorId),
      comments: extra(c.id, "edit").comments,
      resubmitted: extra(c.id, "edit").resubmitted,
      missingMos: false,
    })),
  ]

  // Oldest first: whoever has waited longest goes first.
  return items.sort((a, b) => (a.submittedAt?.getTime() ?? 0) - (b.submittedAt?.getTime() ?? 0))
}

/* --- Credit for edits ------------------------------------------------------------ */

/** Points an admin can award for someone else's edit, by content type. 0 is a minor edit. */
export const CREDIT_OPTIONS: Record<ContentType, number[]> = { question: [1, 3], lesson: [1, 3, 10], course: [1, 3] }

export interface CreditChoice {
  /** The edit is by a curator other than the author, so the reviewer decides. */
  required: boolean
  options: number[]
}

/** Whether approving this edit needs a credit decision: a curator improving someone else's work. */
export async function creditChoice(type: ContentType, proposerId: string | null, authorId: string | null): Promise<CreditChoice> {
  if (!proposerId || proposerId === authorId) return { required: false, options: [] }
  const curator = await prisma.curator.findUnique({ where: { id: proposerId }, select: { id: true } })
  return curator ? { required: true, options: CREDIT_OPTIONS[type] } : { required: false, options: [] }
}

export async function creditsFor(type: ContentType, id: string) {
  const credits = await prisma.contentCredit.findMany({ where: { contentType: type, contentId: id }, orderBy: { createdAt: "asc" } })
  const people = await resolvePeople(credits.map((c) => c.curatorId))
  return credits.map((c) => ({ id: c.id, points: c.points, createdAt: c.createdAt, person: people.get(c.curatorId) ?? null }))
}

/** Checks the award before anything changes. Returns the points to credit, or null when no choice applies. */
async function creditGate(type: ContentType, proposerId: string | null, authorId: string | null, award: number | null | undefined) {
  const choice = await creditChoice(type, proposerId, authorId)
  if (!choice.required) return { points: null as number | null }
  if (award === undefined || award === null) return { error: "Choose whether to credit this edit or accept it as a minor one." }
  if (award !== 0 && !choice.options.includes(award)) return { error: "Pick one of the point options." }
  return { points: award }
}

async function grantCredit(type: ContentType, id: string, curatorId: string | null, points: number | null, staff: Staff) {
  if (!curatorId || !points) return
  await prisma.contentCredit.create({ data: { contentType: type, contentId: id, curatorId, points, awardedById: staff.userId } })
}

/* --- Detail --------------------------------------------------------------------- */

export interface FieldChange {
  field: string
  label: string
  before: string
  after: string
}

function display(field: string, value: unknown, options?: string[]): string {
  if (value == null) return ""
  if (field === "options" && Array.isArray(value)) return value.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join("\n")
  if (field === "correctIndex" && typeof value === "number") {
    return options?.[value] != null ? `${String.fromCharCode(65 + value)}. ${options[value]}` : String(value)
  }
  if (field === "subjectId") return subjectName(String(value))
  if (field === "content" && typeof value === "object") {
    const c = value as Record<string, unknown>
    if (typeof c.html === "string") return htmlToText(c.html)
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

function diff(fields: readonly string[], current: Record<string, unknown>, proposed: Record<string, unknown>): FieldChange[] {
  const changes: FieldChange[] = []
  for (const field of fields) {
    if (proposed[field] === undefined) continue
    const beforeOptions = (current.options as string[]) ?? []
    const afterOptions = (proposed.options as string[]) ?? beforeOptions
    const before = display(field, current[field], beforeOptions)
    const after = display(field, proposed[field], afterOptions)
    if (before !== after) changes.push({ field, label: FIELD_LABELS[field] ?? field, before, after })
  }
  return changes
}

/** What a lesson's content amounts to, for reviewers who aren't in the editor. */
function lessonPreview(contentType: string, content: unknown) {
  const c = (content ?? {}) as Record<string, any>
  if (contentType === "text") return { html: sanitizeHtml(c.html || ""), summary: null }
  if (contentType === "quiz") return { html: null, summary: `${c.questions?.length ?? 0} quiz questions` }
  if (contentType === "flashcards") return { html: null, summary: `${c.cards?.length ?? 0} flashcards` }
  if (contentType === "media") return { html: null, summary: `${c.items?.length ?? 0} media items` }
  return { html: null, summary: `${contentType} lesson` }
}

export async function reviewDetail(type: ContentType, id: string) {
  if (type === "question") {
    const q = await prisma.question.findUnique({ where: { id } })
    if (!q) return null
    const live = effectiveStatus(q.status) === "published"
    const kind: ReviewKind | null = q.status === "review" ? "new" : q.pendingRevision ? "edit" : null
    const proposed = (q.pendingRevision as Record<string, unknown> | null) ?? null
    const people = await resolvePeople([q.authorId, q.pendingRevisionById, q.reviewedById, q.rejectionForId])
    return {
      type,
      id,
      kind,
      title: snippet(q.questionText, 90),
      subjectId: q.subjectId,
      subjectName: subjectName(q.subjectId),
      status: effectiveStatus(q.status),
      live,
      inQueue: kind === "new" || (kind === "edit" && !q.changesRequestedAt),
      changesRequested: !!q.changesRequestedAt || (q.status === "draft" && !!q.rejectionReason),
      author: q.authorId ? people.get(q.authorId) ?? null : null,
      proposer: q.pendingRevisionById ? people.get(q.pendingRevisionById) ?? null : null,
      submittedAt: kind === "edit" ? q.pendingRevisionAt : q.updatedAt,
      editHref: `/admin/questions?subject=${encodeURIComponent(q.subjectId)}&edit=${q.id}`,
      question: {
        current: { ...questionContent(q as unknown as Record<string, unknown>), points: q.points ?? 1, authorNote: q.authorNote },
        proposed: proposed ? { ...questionContent({ ...q, ...proposed } as Record<string, unknown>), authorNote: (proposed.authorNote as string) ?? null } : null,
        mos: await mappingsFor("question", q.id),
      },
      changes: proposed ? diff(QUESTION_FIELDS, q as unknown as Record<string, unknown>, proposed) : [],
      creditChoice: kind === "edit" ? await creditChoice("question", q.pendingRevisionById, q.authorId) : null,
      credits: await creditsFor("question", q.id),
      events: await timeline("question", q.id),
    }
  }

  if (type === "lesson") {
    const l = await prisma.lesson.findUnique({ where: { id }, include: { module: { include: { course: true } } } })
    if (!l) return null
    const proposed = (l.pendingRevision as Record<string, unknown> | null) ?? null
    const people = await resolvePeople([l.authorId, l.pendingRevisionById])
    const course = l.module.course
    const merged = proposed ? { ...l, ...proposed } : l
    return {
      type,
      id,
      kind: proposed ? ("edit" as const) : null,
      title: l.title,
      subjectId: course.subjectId,
      subjectName: subjectName(course.subjectId),
      status: course.isPublished ? "published" : "draft",
      live: course.isPublished,
      inQueue: !!proposed && !l.changesRequestedAt,
      changesRequested: !!l.changesRequestedAt,
      author: l.authorId ? people.get(l.authorId) ?? null : null,
      proposer: l.pendingRevisionById ? people.get(l.pendingRevisionById) ?? null : null,
      submittedAt: l.pendingRevisionAt,
      editHref: `/admin/courses/${course.id}/lesson/${l.id}`,
      lesson: {
        course: { id: course.id, title: course.title, isPublished: course.isPublished },
        module: l.module.title,
        current: { title: l.title, description: l.description, contentType: l.contentType, estimatedMins: l.estimatedMins, ...lessonPreview(l.contentType, l.content) },
        proposed: proposed
          ? {
              title: merged.title as string,
              description: merged.description as string,
              contentType: merged.contentType as string,
              estimatedMins: merged.estimatedMins as number,
              ...lessonPreview(merged.contentType as string, merged.content),
            }
          : null,
        mos: await mappingsFor("lesson", l.id),
      },
      changes: proposed ? diff(LESSON_FIELDS, l as unknown as Record<string, unknown>, proposed) : [],
      creditChoice: proposed ? await creditChoice("lesson", l.pendingRevisionById, l.authorId) : null,
      credits: await creditsFor("lesson", l.id),
      events: await timeline("lesson", l.id),
    }
  }

  const c = await prisma.course.findUnique({
    where: { id },
    include: { modules: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } } },
  })
  if (!c) return null
  const proposed = (c.pendingRevision as Record<string, unknown> | null) ?? null
  const kind: ReviewKind | null = !c.isPublished && c.reviewStatus === "review" ? "new" : proposed ? "edit" : null
  const lessonIds = c.modules.flatMap((m) => m.lessons.map((l) => l.id))
  const mapped = await withPrimaryMapping("lesson", lessonIds)
  const people = await resolvePeople([c.authorId, c.pendingRevisionById, c.submittedById, ...c.modules.flatMap((m) => m.lessons.map((l) => l.authorId))])
  return {
    type,
    id,
    kind,
    title: c.title,
    subjectId: c.subjectId,
    subjectName: subjectName(c.subjectId),
    status: c.isPublished ? "published" : c.reviewStatus ?? "draft",
    live: c.isPublished,
    inQueue: kind === "new" || (kind === "edit" && !c.changesRequestedAt),
    changesRequested: c.reviewStatus === "changes" || !!c.changesRequestedAt,
    author: c.authorId ? people.get(c.authorId) ?? null : null,
    proposer: kind === "edit" && c.pendingRevisionById ? people.get(c.pendingRevisionById) ?? null : c.submittedById ? people.get(c.submittedById) ?? null : null,
    submittedAt: kind === "edit" ? c.pendingRevisionAt : c.submittedAt ?? c.updatedAt,
    editHref: `/admin/courses/${c.id}`,
    course: {
      current: { title: c.title, description: c.description, estimatedHours: c.estimatedHours, difficulty: c.difficulty },
      proposed: proposed ? { ...pick({ title: c.title, description: c.description, estimatedHours: c.estimatedHours, difficulty: c.difficulty }, COURSE_FIELDS), ...pick(proposed, COURSE_FIELDS) } : null,
      modules: c.modules.map((m) => ({
        id: m.id,
        title: m.title,
        lessons: m.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          contentType: l.contentType,
          estimatedMins: l.estimatedMins,
          mosMapped: mapped.has(l.id),
          author: l.authorId ? people.get(l.authorId) ?? null : null,
          href: `/admin/courses/${c.id}/lesson/${l.id}`,
        })),
      })),
      missingMos: lessonIds.filter((lid) => !mapped.has(lid)).length,
    },
    changes: proposed ? diff(COURSE_FIELDS, c as unknown as Record<string, unknown>, proposed) : [],
    creditChoice: kind === "edit" ? await creditChoice("course", c.pendingRevisionById, c.authorId) : null,
    credits: await creditsFor("course", c.id),
    events: await timeline("course", c.id),
  }
}

export type ReviewDetail = NonNullable<Awaited<ReturnType<typeof reviewDetail>>>

/* --- Decisions ------------------------------------------------------------------- */

export interface DecisionResult {
  ok: boolean
  error?: string
  status: number
}

const fail = (error: string, status = 400): DecisionResult => ({ ok: false, error, status })
const done: DecisionResult = { ok: true, status: 200 }

const clearRejection = { rejectionReason: null, rejectedAt: null, rejectionForId: null, changesRequestedAt: null }
// Same shape the content routes have always written.
const clearRevision = { pendingRevision: null, pendingRevisionById: null, pendingRevisionAt: null }

/** Whether this curator may see and comment on the item: they wrote it or proposed the change. */
export async function curatorOwns(type: ContentType, id: string, curatorId: string) {
  // rejectionForId keeps access after a declined edit clears pendingRevisionById.
  const select = { authorId: true, pendingRevisionById: true, rejectionForId: true } as const
  const row =
    type === "question"
      ? await prisma.question.findUnique({ where: { id }, select })
      : type === "lesson"
        ? await prisma.lesson.findUnique({ where: { id }, select })
        : await prisma.course.findUnique({ where: { id }, select: { ...select, submittedById: true } })
  if (!row) return false
  return (
    row.authorId === curatorId ||
    row.pendingRevisionById === curatorId ||
    row.rejectionForId === curatorId ||
    ("submittedById" in row && row.submittedById === curatorId)
  )
}

/**
 * Approve, ask for changes, reject or comment. The item's state decides which
 * review a decision applies to: a question in review is new; a live one with a
 * proposal is an edit.
 */
export async function decide({
  type,
  id,
  action,
  message,
  points,
  award,
  staff,
}: {
  type: ContentType
  id: string
  action: ReviewAction
  message?: string | null
  /** New questions: 1 standard or 3 complex. */
  points?: number
  /** Approving someone else's edit: points to credit them, or 0 for a minor edit. */
  award?: number | null
  staff: Staff
}): Promise<DecisionResult> {
  const note = (message ?? "").trim().slice(0, MESSAGE_MAX)
  const now = new Date()

  if (action === "comment") {
    if (!note) return fail("Write a comment first.")
    if (!staff.isAdmin && !(await curatorOwns(type, id, staff.userId))) return fail("You can only comment on your own work.", 403)
    const detail = await reviewDetail(type, id)
    if (!detail) return fail("Not found.", 404)
    await logEvent({ contentType: type, contentId: id, kind: detail.kind ?? (detail.live ? "edit" : "new"), action: "comment", staff, message: note })
    return done
  }

  if (!staff.isAdmin) return fail("Only an admin can make review decisions.", 403)
  // Asking for changes always needs a note. So does rejecting new work; a
  // declined edit to live content may go without one.
  const needsNote = action === "request-changes" || (action === "reject" && !(await isEdit(type, id)))
  if (needsNote && note.length < 10) return fail("Tell them why, in a sentence or two.")

  /* Questions */
  if (type === "question") {
    const q = await prisma.question.findUnique({ where: { id } })
    if (!q) return fail("Question not found.", 404)

    if (q.status === "review") {
      if (action === "approve") {
        if (!(await hasPrimaryMapping("question", id))) return fail(MOS_PUBLISH_ERROR, 422)
        await prisma.question.update({
          where: { id },
          data: { status: "published", reviewedById: staff.userId, points: points === 3 ? 3 : points === 1 ? 1 : q.points, ...clearRejection },
        })
      } else {
        await prisma.question.update({
          where: { id },
          data: {
            status: action === "reject" ? "rejected" : "draft",
            reviewedById: staff.userId,
            rejectionReason: note || null,
            rejectedAt: now,
            rejectionForId: q.authorId,
            changesRequestedAt: action === "request-changes" ? now : null,
          },
        })
      }
      await logEvent({ contentType: "question", contentId: id, kind: "new", action: eventFor(action), staff, message: note || null })
      return done
    }

    if (q.pendingRevision) {
      const revision = q.pendingRevision as Record<string, unknown>
      const credit = action === "approve" ? await creditGate("question", q.pendingRevisionById, q.authorId, award) : { points: null }
      if ("error" in credit) return fail(credit.error, 422)
      if (action === "approve") {
        await prisma.question.update({
          where: { id },
          data: { ...questionContent({ ...q, ...revision } as Record<string, unknown>), reviewedById: staff.userId, ...clearRevision, ...clearRejection },
        })
        await grantCredit("question", id, q.pendingRevisionById, credit.points, staff)
      } else if (action === "request-changes") {
        // The proposal stays with the curator to rework; students still see the live version.
        await prisma.question.update({
          where: { id },
          data: { rejectionReason: note || null, rejectedAt: now, rejectionForId: q.pendingRevisionById, changesRequestedAt: now },
        })
      } else {
        await prisma.question.update({
          where: { id },
          data: { ...clearRevision, rejectionReason: note || null, rejectedAt: now, rejectionForId: q.pendingRevisionById, changesRequestedAt: null },
        })
      }
      await logEvent({ contentType: "question", contentId: id, kind: "edit", action: eventFor(action), staff, message: note || null, points: credit.points })
      return done
    }
    return fail("This question isn't waiting for review.")
  }

  /* Lessons: proposed edits to live courses. New lessons are reviewed with their course. */
  if (type === "lesson") {
    const l = await prisma.lesson.findUnique({ where: { id } })
    if (!l) return fail("Lesson not found.", 404)
    if (!l.pendingRevision) return fail("This lesson has no proposed edits. New lessons are reviewed with their course.")
    const revision = l.pendingRevision as Record<string, unknown>
    const credit = action === "approve" ? await creditGate("lesson", l.pendingRevisionById, l.authorId, award) : { points: null }
    if ("error" in credit) return fail(credit.error, 422)
    if (action === "approve") {
      await prisma.lesson.update({
        where: { id },
        data: { ...(pick(revision, LESSON_FIELDS) as Prisma.LessonUpdateInput), ...clearRevision, ...clearRejection },
      })
      await grantCredit("lesson", id, l.pendingRevisionById, credit.points, staff)
    } else if (action === "request-changes") {
      await prisma.lesson.update({ where: { id }, data: { rejectionReason: note || null, rejectedAt: now, rejectionForId: l.pendingRevisionById, changesRequestedAt: now } })
    } else {
      await prisma.lesson.update({
        where: { id },
        data: { ...clearRevision, rejectionReason: note || null, rejectedAt: now, rejectionForId: l.pendingRevisionById, changesRequestedAt: null },
      })
    }
    await logEvent({ contentType: "lesson", contentId: id, kind: "edit", action: eventFor(action), staff, message: note || null, points: credit.points })
    return done
  }

  /* Courses */
  const c = await prisma.course.findUnique({ where: { id } })
  if (!c) return fail("Course not found.", 404)

  if (!c.isPublished && c.reviewStatus === "review") {
    if (action === "approve") {
      const missing = await lessonsMissingPrimary(id)
      if (missing.length) {
        const names = missing.slice(0, 3).map((m) => `"${m.title}"`).join(", ")
        return fail(`Link every lesson to a MOS item first. Still to do: ${names}${missing.length > 3 ? ` and ${missing.length - 3} more` : ""}.`, 422)
      }
      await prisma.course.update({ where: { id }, data: { isPublished: true, reviewStatus: null, ...clearRejection } })
    } else {
      await prisma.course.update({
        where: { id },
        data: {
          reviewStatus: action === "reject" ? "rejected" : "changes",
          rejectionReason: note || null,
          rejectedAt: now,
          rejectionForId: c.submittedById ?? c.authorId,
          changesRequestedAt: action === "request-changes" ? now : null,
        },
      })
    }
    await logEvent({ contentType: "course", contentId: id, kind: "new", action: eventFor(action), staff, message: note || null })
    return done
  }

  if (c.pendingRevision) {
    const revision = c.pendingRevision as Record<string, unknown>
    const credit = action === "approve" ? await creditGate("course", c.pendingRevisionById, c.authorId, award) : { points: null }
    if ("error" in credit) return fail(credit.error, 422)
    if (action === "approve") {
      await prisma.course.update({ where: { id }, data: { ...pick(revision, COURSE_FIELDS), ...clearRevision, ...clearRejection } })
      await grantCredit("course", id, c.pendingRevisionById, credit.points, staff)
    } else if (action === "request-changes") {
      await prisma.course.update({ where: { id }, data: { rejectionReason: note || null, rejectedAt: now, rejectionForId: c.pendingRevisionById, changesRequestedAt: now } })
    } else {
      await prisma.course.update({
        where: { id },
        data: { ...clearRevision, rejectionReason: note || null, rejectedAt: now, rejectionForId: c.pendingRevisionById, changesRequestedAt: null },
      })
    }
    await logEvent({ contentType: "course", contentId: id, kind: "edit", action: eventFor(action), staff, message: note || null, points: credit.points })
    return done
  }

  return fail("This course isn't waiting for review.")
}

async function isEdit(type: ContentType, id: string) {
  if (type === "lesson") return true
  if (type === "question") {
    const q = await prisma.question.findUnique({ where: { id }, select: { status: true } })
    return q?.status !== "review"
  }
  const c = await prisma.course.findUnique({ where: { id }, select: { isPublished: true, reviewStatus: true } })
  return !!c && !(c.reviewStatus === "review" && !c.isPublished)
}

function eventFor(action: Exclude<ReviewAction, "comment">): EventAction {
  return action === "approve" ? "approved" : action === "reject" ? "rejected" : "changes-requested"
}

/** Counts for the nav badge and overview. */
export async function reviewCount() {
  return (await reviewQueue()).length
}

