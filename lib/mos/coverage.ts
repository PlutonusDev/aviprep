import "server-only"

import { prisma } from "@lib/prisma"
import { SUBJECTS } from "@lib/subjects"
import { MIN_QUESTIONS_PER_ITEM, SUBJECT_MOS_UNITS, mosId, unitsForSubject, type MosReviewReason, type MosStatus } from "@lib/mos/subjects"
import { subjectUnitNumbers } from "@lib/mos/library"
import { withPrimaryMapping } from "@lib/mos/mappings"

/**
 * Schedule 3 coverage. Only live content counts towards "mapped": a draft
 * question can't be relied on in a compliance document. Drafts show separately
 * so curators can see work in progress.
 */

const liveItem = { OR: [{ retired: false }, { retired: null }, { retired: { isSet: false } }] }
const liveQuestion = { OR: [{ status: "published" }, { status: null }, { status: { isSet: false } }] }

export interface CoverageUnit {
  number: string
  code: string
  title: string
  reserved: boolean
}

export interface SubjectCoverage {
  subjectId: string
  code: string
  name: string
  licence: string
  comingSoon: boolean
  units: CoverageUnit[]
  /** Items that count: everything current and not excluded. */
  assessable: number
  excluded: number
  /** Assessable items with at least one live question or lesson. */
  mapped: number
  missing: number
  /** Mapped, but with fewer live questions than MIN_QUESTIONS_PER_ITEM. */
  lowDensity: number
  draftOnly: number
  percent: number
  liveQuestions: number
  unmappedQuestions: number
  liveLessons: number
  unmappedLessons: number
  /** Links to this subject's content flagged by a MOS update. */
  openReviews: number
}

export interface ReviewItem {
  mappingId: string
  reason: MosReviewReason
  note: string | null
  flaggedAt: string | null
  primary: boolean
  contentType: "question" | "lesson"
  contentId: string
  /** Question text or lesson title. */
  contentLabel: string
  /** Course › module, for lessons. */
  contentContext: string | null
  courseId: string | null
  live: boolean
  item: { id: string; mosId: string; fullText: string; retired: boolean }
  suggestions: { id: string; mosId: string; fullText: string }[]
}

export interface LessonRef {
  id: string
  title: string
  courseId: string
  courseTitle: string
  moduleTitle: string
  live: boolean
  primary: boolean
}

export interface ItemCoverage {
  id: string
  mosId: string
  unitNumber: string
  unitCode: string
  ref: string
  topicNumber: string
  topicTitle: string
  subtopicNumber: string
  subtopicTitle: string
  fullText: string
  excluded: boolean
  excludedReason: string | null
  status: MosStatus
  liveQuestions: number
  draftQuestions: number
  lessons: LessonRef[]
}

export interface ModuleCoverage {
  courseId: string
  courseTitle: string
  courseLive: boolean
  moduleId: string
  moduleTitle: string
  lessons: { id: string; title: string; mosIds: string[]; primaryMosId: string | null }[]
}

export interface CoverageDetail {
  summary: SubjectCoverage
  items: ItemCoverage[]
  modules: ModuleCoverage[]
  unmappedQuestions: { id: string; topic: string; questionText: string }[]
  unmappedLessons: { id: string; title: string; courseId: string; courseTitle: string; moduleTitle: string; live: boolean }[]
  /** Links pointing at items that were removed from the loaded compilation. */
  retiredLinks: number
  /** Links flagged by a MOS update, waiting for a person. */
  reviews: ReviewItem[]
}

async function build(subjectIds: string[], detail: boolean) {
  // Resolved by unit code, so a renumbered unit still belongs to its subject.
  const numbersBySubject = new Map(await Promise.all(subjectIds.map(async (id) => [id, await subjectUnitNumbers(id)] as const)))
  const unitNumbers = [...new Set([...numbersBySubject.values()].flat())]

  const [units, items, courses, questions] = await Promise.all([
    prisma.mosUnit.findMany({ where: { number: { in: unitNumbers }, ...liveItem }, select: { number: true, code: true, title: true, reserved: true } }),
    prisma.mosItem.findMany({
      where: { unitNumber: { in: unitNumbers }, ...liveItem },
      select: {
        id: true,
        unitNumber: true,
        unitCode: true,
        ref: true,
        topicNumber: true,
        topicTitle: true,
        subtopicNumber: true,
        subtopicTitle: true,
        fullText: true,
        excluded: true,
        excludedReason: true,
        order: true,
      },
    }),
    prisma.course.findMany({
      where: { subjectId: { in: subjectIds } },
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        subjectId: true,
        isPublished: true,
        modules: {
          orderBy: { order: "asc" },
          select: { id: true, title: true, lessons: { orderBy: { order: "asc" }, select: { id: true, title: true } } },
        },
      },
    }),
    prisma.question.findMany({
      where: { subjectId: { in: subjectIds } },
      select: { id: true, subjectId: true, status: true, ...(detail ? { topic: true, questionText: true } : {}) },
    }),
  ])

  const itemIds = items.map((i) => i.id)
  const lessonIds = courses.flatMap((c) => c.modules.flatMap((m) => m.lessons.map((l) => l.id)))
  const questionIds = questions.map((q) => q.id)

  // All links touching these subjects' items or content. The overview spans
  // every subject, where reading the whole (small) collection beats huge `in` lists.
  const mappings = await prisma.mosMapping.findMany({
    where: detail
      ? {
          OR: [
            { itemId: { in: itemIds } },
            { contentType: "question", contentId: { in: questionIds } },
            { contentType: "lesson", contentId: { in: lessonIds } },
          ],
        }
      : undefined,
    select: {
      id: true,
      itemId: true,
      contentType: true,
      contentId: true,
      primary: true,
      needsReview: true,
      reviewReason: true,
      reviewNote: true,
      suggestedItemIds: true,
      flaggedAt: true,
    },
  })

  // Items that flagged links point at (removed ones) or suggest, which may sit outside the current set.
  const extraIds = detail
    ? [...new Set(mappings.filter((m) => m.needsReview).flatMap((m) => [m.itemId, ...(m.suggestedItemIds ?? [])]))]
    : []
  const reviewItems = extraIds.length
    ? await prisma.mosItem.findMany({ where: { id: { in: extraIds } }, select: { id: true, unitCode: true, ref: true, fullText: true, retired: true } })
    : []

  return { numbersBySubject, units, items, courses, questions, mappings, reviewItems }
}

function isLiveStatus(status: string | null | undefined) {
  return status === "published" || status === null || status === undefined
}

function summarise(
  subjectId: string,
  data: Awaited<ReturnType<typeof build>>,
  detail: boolean,
): { summary: SubjectCoverage; detail?: Omit<CoverageDetail, "summary"> } {
  const subject = SUBJECTS.find((s) => s.id === subjectId)
  const unitNumbers = data.numbersBySubject.get(subjectId) ?? []

  const units = unitNumbers
    .map((n) => data.units.find((u) => u.number === n))
    .filter(Boolean)
    .map((u) => ({ number: u!.number, code: u!.code, title: u!.title, reserved: u!.reserved }))

  const items = data.items
    .filter((i) => unitNumbers.includes(i.unitNumber))
    .sort((a, b) => unitNumbers.indexOf(a.unitNumber) - unitNumbers.indexOf(b.unitNumber) || a.order - b.order)
  const itemIdSet = new Set(items.map((i) => i.id))

  const questions = data.questions.filter((q) => q.subjectId === subjectId)
  const questionById = new Map(questions.map((q) => [q.id, q]))

  const courses = data.courses.filter((c) => c.subjectId === subjectId)
  const lessonInfo = new Map<string, Omit<LessonRef, "primary">>()
  for (const c of courses)
    for (const m of c.modules)
      for (const l of m.lessons)
        lessonInfo.set(l.id, { id: l.id, title: l.title, courseId: c.id, courseTitle: c.title, moduleTitle: m.title, live: c.isPublished })

  const liveQ = new Map<string, number>()
  const draftQ = new Map<string, number>()
  const lessonsByItem = new Map<string, LessonRef[]>()
  const primaryQuestions = new Set<string>()
  const primaryLessons = new Set<string>()
  const lessonLinks = new Map<string, { itemId: string; primary: boolean }[]>()
  let retiredLinks = 0

  for (const m of data.mappings) {
    if (m.contentType === "question") {
      const q = questionById.get(m.contentId)
      if (!q) continue
      if (!itemIdSet.has(m.itemId)) {
        // Flagged ones are listed for review instead.
        if (!m.needsReview) retiredLinks++
        continue
      }
      if (m.primary) primaryQuestions.add(q.id)
      const target = isLiveStatus(q.status) ? liveQ : draftQ
      target.set(m.itemId, (target.get(m.itemId) ?? 0) + 1)
    } else {
      const l = lessonInfo.get(m.contentId)
      if (!l) continue
      if (!itemIdSet.has(m.itemId)) {
        // Flagged ones are listed for review instead.
        if (!m.needsReview) retiredLinks++
        continue
      }
      if (m.primary) primaryLessons.add(l.id)
      const refs = lessonsByItem.get(m.itemId) ?? []
      refs.push({ ...l, primary: m.primary })
      lessonsByItem.set(m.itemId, refs)
      const links = lessonLinks.get(l.id) ?? []
      links.push({ itemId: m.itemId, primary: m.primary })
      lessonLinks.set(l.id, links)
    }
  }

  let mapped = 0
  let lowDensity = 0
  let draftOnly = 0
  let excluded = 0

  // Flagged links for this subject's content.
  const flagged = data.mappings.filter(
    (m) => m.needsReview && (m.contentType === "question" ? questionById.has(m.contentId) : lessonInfo.has(m.contentId)),
  )

  const itemRows: ItemCoverage[] = items.map((i) => {
    const live = liveQ.get(i.id) ?? 0
    const drafts = draftQ.get(i.id) ?? 0
    const lessons = lessonsByItem.get(i.id) ?? []
    const liveLessons = lessons.filter((l) => l.live).length

    let status: MosStatus
    if (i.excluded) {
      status = "excluded"
      excluded++
    } else if (live + liveLessons > 0) {
      mapped++
      if (live < MIN_QUESTIONS_PER_ITEM) {
        status = "low"
        lowDensity++
      } else status = "covered"
    } else if (drafts + lessons.length > 0) {
      status = "draft"
      draftOnly++
    } else status = "missing"

    return {
      id: i.id,
      mosId: mosId(i.unitCode, i.ref),
      unitNumber: i.unitNumber,
      unitCode: i.unitCode,
      ref: i.ref,
      topicNumber: i.topicNumber,
      topicTitle: i.topicTitle,
      subtopicNumber: i.subtopicNumber,
      subtopicTitle: i.subtopicTitle,
      fullText: i.fullText,
      excluded: !!i.excluded,
      excludedReason: i.excludedReason ?? null,
      status,
      liveQuestions: live,
      draftQuestions: drafts,
      lessons,
    }
  })

  const assessable = items.length - excluded
  const liveQuestions = questions.filter((q) => isLiveStatus(q.status))
  const liveLessonIds = [...lessonInfo.values()].filter((l) => l.live).map((l) => l.id)

  const summary: SubjectCoverage = {
    subjectId,
    code: subject?.code ?? subjectId,
    name: subject?.name ?? subjectId,
    licence: subject?.licenseType ?? "",
    comingSoon: !!subject?.comingSoon,
    units,
    assessable,
    excluded,
    mapped,
    missing: assessable - mapped - draftOnly,
    lowDensity,
    draftOnly,
    // Floor, so 99.6% never reads as a complete 100%.
    percent: assessable ? Math.floor((mapped / assessable) * 100) : 0,
    liveQuestions: liveQuestions.length,
    unmappedQuestions: liveQuestions.filter((q) => !primaryQuestions.has(q.id)).length,
    liveLessons: liveLessonIds.length,
    unmappedLessons: liveLessonIds.filter((id) => !primaryLessons.has(id)).length,
    openReviews: flagged.length,
  }

  if (!detail) return { summary }

  const mosIdByItem = new Map(itemRows.map((i) => [i.id, i.mosId]))
  const modules: ModuleCoverage[] = courses.flatMap((c) =>
    c.modules.map((m) => ({
      courseId: c.id,
      courseTitle: c.title,
      courseLive: c.isPublished,
      moduleId: m.id,
      moduleTitle: m.title,
      lessons: m.lessons.map((l) => {
        const links = (lessonLinks.get(l.id) ?? []).sort((a, b) => Number(b.primary) - Number(a.primary))
        const primary = links.find((x) => x.primary)
        return {
          id: l.id,
          title: l.title,
          mosIds: links.map((x) => mosIdByItem.get(x.itemId)!).filter(Boolean),
          primaryMosId: primary ? mosIdByItem.get(primary.itemId) ?? null : null,
        }
      }),
    })),
  )

  return {
    summary,
    detail: {
      items: itemRows,
      modules,
      unmappedQuestions: liveQuestions
        .filter((q) => !primaryQuestions.has(q.id))
        .slice(0, 200)
        .map((q) => ({
          id: q.id,
          topic: (q as { topic?: string }).topic ?? "",
          questionText: ((q as { questionText?: string }).questionText ?? "").slice(0, 160),
        })),
      unmappedLessons: [...lessonInfo.values()]
        .filter((l) => !primaryLessons.has(l.id))
        .map((l) => ({ id: l.id, title: l.title, courseId: l.courseId, courseTitle: l.courseTitle, moduleTitle: l.moduleTitle, live: l.live })),
      retiredLinks,
      reviews: flagged.map((m) => {
        const reviewItem = data.reviewItems.find((x) => x.id === m.itemId)
        const lesson = m.contentType === "lesson" ? lessonInfo.get(m.contentId) : null
        const question = m.contentType === "question" ? questionById.get(m.contentId) : null
        return {
          mappingId: m.id,
          reason: (m.reviewReason === "removed" ? "removed" : "reworded") as MosReviewReason,
          note: m.reviewNote ?? null,
          flaggedAt: m.flaggedAt ? m.flaggedAt.toISOString() : null,
          primary: m.primary,
          contentType: m.contentType === "lesson" ? "lesson" : "question",
          contentId: m.contentId,
          contentLabel: lesson ? lesson.title : (((question as { questionText?: string } | null)?.questionText ?? "").slice(0, 200)),
          contentContext: lesson ? `${lesson.courseTitle} › ${lesson.moduleTitle}` : null,
          courseId: lesson?.courseId ?? null,
          live: lesson ? lesson.live : isLiveStatus(question?.status),
          item: {
            id: m.itemId,
            mosId: reviewItem ? mosId(reviewItem.unitCode, reviewItem.ref) : "Unknown item",
            fullText: reviewItem?.fullText ?? "",
            retired: !!reviewItem?.retired,
          },
          suggestions: (m.suggestedItemIds ?? [])
            .map((id) => data.reviewItems.find((x) => x.id === id))
            .filter((x): x is NonNullable<typeof x> => !!x && !x.retired)
            .map((x) => ({ id: x.id, mosId: mosId(x.unitCode, x.ref), fullText: x.fullText })),
        }
      }),
    },
  }
}

/** One row per subject that has Schedule 3 units. */
export async function coverageOverview(): Promise<SubjectCoverage[]> {
  const subjectIds = SUBJECTS.map((s) => s.id).filter((id) => SUBJECT_MOS_UNITS[id]?.codes.length)
  const data = await build(subjectIds, false)
  return subjectIds.map((id) => summarise(id, data, false).summary)
}

export async function coverageDetail(subjectId: string): Promise<CoverageDetail | null> {
  if (!unitsForSubject(subjectId).length) return null
  const data = await build([subjectId], true)
  const { summary, detail } = summarise(subjectId, data, true)
  return { summary, ...detail! }
}

/** Lessons in a course that don't yet have a primary MOS item (on a current item). Used to gate publishing. */
export async function lessonsMissingPrimary(courseId: string) {
  const lessons = await prisma.lesson.findMany({
    where: { module: { courseId } },
    select: { id: true, title: true },
  })
  if (!lessons.length) return []
  const ok = await withPrimaryMapping("lesson", lessons.map((l) => l.id))
  return lessons.filter((l) => !ok.has(l.id))
}
