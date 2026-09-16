import "server-only"

import crypto from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"
import { embedMany } from "ai"
import { Prisma } from "@prisma/client"
import { prisma } from "@lib/prisma"
import { itemFullText, type ParsedUnit } from "@lib/mos/schedule3-parser"
import { reconcile, type ReconcilePlan } from "@lib/mos/reconcile"
import { SUBJECT_MOS_UNITS, appendixForSubject, appendixOf, mosId, unitsForSubject } from "@lib/mos/subjects"
import { SUBJECTS } from "@lib/subjects"
import type { ChangeReport, ContentRef, SubjectImpact } from "@lib/mos/change-report"

/**
 * The Schedule 3 library in the database: loading and updating it from the
 * bundled JSON, resolving a subject's units, and keeping embeddings current.
 *
 * Updates never match on reference alone - see lib/mos/reconcile.ts. An admin
 * previews what an update will do, then applies it; items keep their ids (and
 * so their links) through renumbering and rewording, and anything a person
 * should look at lands in the review queue instead of silently unlinking.
 *
 * Vectors live on the MosItem documents and similarity is computed in process.
 * A subject has a few hundred items at most, so a brute-force cosine is
 * instant, needs no vector index, and works on any MongoDB deployment.
 */

export const EMBEDDING_MODEL = "openai/text-embedding-3-small"
const STATUS_KEY = "mos-library"
const DATA_FILE = ["lib", "mos", "data", "schedule3.json"]

export interface LibraryStatus {
  loaded: boolean
  compilation: string | null
  registered: string | null
  units: number
  items: number
  loadedAt: string | null
  /** The bundled data file differs from what was last applied. */
  updateAvailable: boolean
  bundledCompilation: string | null
  bundledBuiltAt: string | null
  /** Links waiting for review after an update. */
  openReviews: number
  lastRevision: { compilation: string | null; fromCompilation: string | null; appliedAt: string; flaggedLinks: number } | null
}

interface BundledSchedule {
  source: { compilation: string | null; registered: string | null; builtAt: string }
  units: ParsedUnit[]
}

async function readBundled(): Promise<BundledSchedule> {
  const file = path.join(/*turbopackIgnore: true*/ process.cwd(), ...DATA_FILE)
  return JSON.parse(await fs.readFile(/*turbopackIgnore: true*/ file, "utf8"))
}

const hash = (text: string) => crypto.createHash("sha1").update(text).digest("hex")
const notRetired = { OR: [{ retired: false }, { retired: null }, { retired: { isSet: false } }] }

interface StoredStatus {
  compilation?: string | null
  registered?: string | null
  builtAt?: string
  units?: number
  loadedAt?: string
}

async function readStoredStatus(): Promise<StoredStatus> {
  const row = await prisma.siteSetting.findUnique({ where: { key: STATUS_KEY } })
  return (row?.value ?? {}) as StoredStatus
}

export async function getLibraryStatus(): Promise<LibraryStatus> {
  const [stored, items, bundled, openReviews, last] = await Promise.all([
    readStoredStatus(),
    prisma.mosItem.count({ where: notRetired }),
    readBundled().catch(() => null),
    prisma.mosMapping.count({ where: { needsReview: true } }),
    prisma.mosRevision.findFirst({ orderBy: { appliedAt: "desc" } }),
  ])
  return {
    loaded: items > 0,
    compilation: stored.compilation ?? null,
    registered: stored.registered ?? null,
    units: stored.units ?? 0,
    items,
    loadedAt: stored.loadedAt ?? null,
    updateAvailable: !!bundled && (items === 0 || stored.builtAt !== bundled.source.builtAt),
    bundledCompilation: bundled?.source.compilation ?? null,
    bundledBuiltAt: bundled?.source.builtAt ?? null,
    openReviews,
    lastRevision: last
      ? { compilation: last.compilation, fromCompilation: last.fromCompilation, appliedAt: last.appliedAt.toISOString(), flaggedLinks: last.flaggedLinks }
      : null,
  }
}

/* -------------------------------------------------------------------------- */
/* Subject units                                                               */
/* -------------------------------------------------------------------------- */

let unitCache: { at: number; byKey: Map<string, { number: string; code: string; title: string; reserved: boolean }> } | null = null

async function currentUnits() {
  if (unitCache && Date.now() - unitCache.at < 60_000) return unitCache.byKey
  const units = await prisma.mosUnit.findMany({ where: notRetired, select: { number: true, code: true, title: true, reserved: true, appendix: true } })
  const byKey = new Map(units.map((u) => [`${u.appendix ?? appendixOf(u.number)}/${u.code}`, u]))
  unitCache = { at: Date.now(), byKey }
  return byKey
}

/** The subject's units as they're numbered in the loaded compilation, in subject order. */
export async function subjectUnits(subjectId: string) {
  const appendix = appendixForSubject(subjectId)
  const byKey = await currentUnits()
  return unitsForSubject(subjectId)
    .map((code) => byKey.get(`${appendix}/${code}`))
    .filter((u): u is NonNullable<typeof u> => !!u)
}

export async function subjectUnitNumbers(subjectId: string) {
  return (await subjectUnits(subjectId)).map((u) => u.number)
}

export const ITEM_SUMMARY_SELECT = {
  id: true,
  unitCode: true,
  unitNumber: true,
  ref: true,
  topicTitle: true,
  subtopicTitle: true,
  fullText: true,
  retired: true,
} as const

/** Items a subject is responsible for, in Schedule order, without vectors. */
export async function itemsForSubject(subjectId: string) {
  const units = await subjectUnitNumbers(subjectId)
  if (!units.length) return []
  const items = await prisma.mosItem.findMany({
    where: { unitNumber: { in: units }, ...notRetired },
    select: { ...ITEM_SUMMARY_SELECT, excluded: true, excludedReason: true, topicNumber: true, subtopicNumber: true, elementNumber: true, order: true },
  })
  return items.sort((a, b) => units.indexOf(a.unitNumber) - units.indexOf(b.unitNumber) || a.order - b.order)
}

/* -------------------------------------------------------------------------- */
/* Updates                                                                     */
/* -------------------------------------------------------------------------- */

interface IncomingRow {
  appendix: string
  unitNumber: string
  unitCode: string
  ref: string
  topicNumber: string
  topicTitle: string
  subtopicNumber: string
  subtopicTitle: string
  elementNumber: string
  elementText: string
  text: string
  fullText: string
  order: number
}

function flatten(bundled: BundledSchedule): IncomingRow[] {
  const rows: IncomingRow[] = []
  for (const u of bundled.units) {
    if (u.reserved) continue
    let order = 0
    for (const t of u.topics)
      for (const s of t.subtopics)
        for (const e of s.elements)
          for (const it of e.items) {
            rows.push({
              appendix: appendixOf(u.number),
              unitNumber: u.number,
              unitCode: u.code,
              ref: it.ref,
              topicNumber: t.number,
              topicTitle: t.title,
              subtopicNumber: s.number,
              subtopicTitle: s.title,
              elementNumber: e.number,
              elementText: e.text,
              text: it.text,
              fullText: itemFullText(e, it),
              order: order++,
            })
          }
  }
  return rows
}

interface Computed {
  bundled: BundledSchedule
  stored: StoredStatus
  incoming: IncomingRow[]
  existing: {
    id: string
    key: string
    appendix: string | null
    unitNumber: string
    unitCode: string
    ref: string
    elementText: string
    text: string
    fullText: string
    topicTitle: string
    subtopicTitle: string
    topicNumber: string
    subtopicNumber: string
    elementNumber: string
    order: number
    retired: boolean | null
    history: Prisma.JsonValue | null
  }[]
  plan: ReconcilePlan
  linkCounts: Map<string, number>
  linksByItem: Map<string, { contentType: string; contentId: string }[]>
}

async function compute(): Promise<Computed> {
  const [bundled, stored, existing, mappings] = await Promise.all([
    readBundled(),
    readStoredStatus(),
    prisma.mosItem.findMany({
      select: {
        id: true,
        key: true,
        appendix: true,
        unitNumber: true,
        unitCode: true,
        ref: true,
        elementText: true,
        text: true,
        fullText: true,
        topicTitle: true,
        subtopicTitle: true,
        topicNumber: true,
        subtopicNumber: true,
        elementNumber: true,
        order: true,
        retired: true,
        history: true,
      },
    }),
    prisma.mosMapping.findMany({ select: { itemId: true, contentType: true, contentId: true } }),
  ])
  const incoming = flatten(bundled)
  const plan = reconcile(
    existing.map((e) => ({
      id: e.id,
      appendix: e.appendix ?? appendixOf(e.unitNumber),
      unitCode: e.unitCode,
      ref: e.ref,
      elementText: e.elementText,
      text: e.text,
      retired: !!e.retired,
    })),
    incoming,
  )
  const linkCounts = new Map<string, number>()
  const linksByItem = new Map<string, { contentType: string; contentId: string }[]>()
  for (const m of mappings) {
    linkCounts.set(m.itemId, (linkCounts.get(m.itemId) ?? 0) + 1)
    const list = linksByItem.get(m.itemId) ?? []
    list.push(m)
    linksByItem.set(m.itemId, list)
  }
  return { bundled, stored, incoming, existing, plan, linkCounts, linksByItem }
}

export type UpdatePreview = ChangeReport

/** Subjects whose units include this one. */
function subjectCodesFor(appendix: string, unitCode: string) {
  return Object.entries(SUBJECT_MOS_UNITS)
    .filter(([, def]) => def.appendix === appendix && def.codes.includes(unitCode))
    .map(([subjectId]) => subjectId)
}

async function contentRefs(links: { contentType: string; contentId: string }[]) {
  const questionIds = [...new Set(links.filter((l) => l.contentType === "question").map((l) => l.contentId))]
  const lessonIds = [...new Set(links.filter((l) => l.contentType === "lesson").map((l) => l.contentId))]
  const [questions, lessons] = await Promise.all([
    questionIds.length
      ? prisma.question.findMany({ where: { id: { in: questionIds } }, select: { id: true, questionText: true, status: true } })
      : [],
    lessonIds.length
      ? prisma.lesson.findMany({
          where: { id: { in: lessonIds } },
          select: { id: true, title: true, module: { select: { title: true, course: { select: { title: true, isPublished: true } } } } },
        })
      : [],
  ])
  const refs = new Map<string, ContentRef>()
  for (const q of questions) {
    refs.set(`question:${q.id}`, {
      type: "question",
      label: q.questionText.length > 160 ? `${q.questionText.slice(0, 157)}...` : q.questionText,
      context: null,
      live: q.status === "published" || q.status === null || q.status === undefined,
    })
  }
  for (const l of lessons) {
    refs.set(`lesson:${l.id}`, {
      type: "lesson",
      label: l.title,
      context: l.module ? `${l.module.course.title} › ${l.module.title}` : null,
      live: !!l.module?.course.isPublished,
    })
  }
  return refs
}

/** The change report for applying the bundled file on top of the current library. */
async function summarise(c: Computed): Promise<ChangeReport> {
  const { plan, incoming, existing, linkCounts, linksByItem } = c
  const byId = new Map(existing.map((e) => [e.id, e]))
  const links = (id: string) => linkCounts.get(id) ?? 0
  const at = (i: IncomingRow) => mosId(i.unitCode, i.ref)
  const subjectById = new Map(SUBJECTS.map((x) => [x.id, x]))
  const codes = (ids: string[]) => ids.map((id) => subjectById.get(id)?.code ?? id)

  const moved = plan.matches.filter((m) => m.kind === "moved")
  const reworded = plan.matches.filter((m) => m.kind === "reworded")

  // Every piece of content touched by a flagged change, looked up once.
  const flaggedItemIds = [...reworded.map((m) => m.existingId), ...plan.removed.map((r) => r.existingId)]
  const refs = await contentRefs(flaggedItemIds.flatMap((id) => linksByItem.get(id) ?? []))
  const contentFor = (itemId: string) =>
    (linksByItem.get(itemId) ?? [])
      .map((l) => refs.get(`${l.contentType}:${l.contentId}`))
      .filter((r): r is ContentRef => !!r)
      .sort((a, b) => Number(b.live) - Number(a.live))

  // Impact per subject.
  const impact = new Map<string, SubjectImpact>()
  const bump = (subjectIds: string[], field: keyof Omit<SubjectImpact, "subjectId" | "code" | "name">, by = 1) => {
    for (const id of subjectIds) {
      const subject = subjectById.get(id)
      const row = impact.get(id) ?? { subjectId: id, code: subject?.code ?? id, name: subject?.name ?? id, moved: 0, reworded: 0, removed: 0, added: 0, carriedLinks: 0, flaggedLinks: 0 }
      row[field] += by
      impact.set(id, row)
    }
  }

  const movedRows = moved.map((m) => {
    const e = byId.get(m.existingId)!
    const i = incoming[m.incoming]
    const subjects = subjectCodesFor(i.appendix, i.unitCode)
    bump(subjects, "moved")
    bump(subjects, "carriedLinks", links(m.existingId))
    return { from: mosId(e.unitCode, e.ref), to: at(i), subjects: codes(subjects), links: links(m.existingId) }
  })

  const rewordedRows = reworded.map((m) => {
    const e = byId.get(m.existingId)!
    const i = incoming[m.incoming]
    const subjects = subjectCodesFor(i.appendix, i.unitCode)
    bump(subjects, "reworded")
    bump(subjects, m.needsReview ? "flaggedLinks" : "carriedLinks", links(m.existingId))
    return {
      id: m.existingId,
      from: mosId(e.unitCode, e.ref),
      to: at(i),
      before: e.fullText,
      after: i.fullText,
      similarity: Math.round(m.similarity * 100) / 100,
      needsReview: m.needsReview,
      subjects: codes(subjects),
      links: links(m.existingId),
      content: contentFor(m.existingId),
    }
  })

  const removedRows = plan.removed.map((r) => {
    const e = byId.get(r.existingId)!
    const subjects = subjectCodesFor(e.appendix ?? appendixOf(e.unitNumber), e.unitCode)
    bump(subjects, "removed")
    bump(subjects, "flaggedLinks", links(r.existingId))
    return {
      id: mosId(e.unitCode, e.ref),
      text: e.fullText,
      subjects: codes(subjects),
      links: links(r.existingId),
      content: contentFor(r.existingId),
      suggestions: r.suggestions.map((sug) => ({ id: at(incoming[sug.incoming]), text: incoming[sug.incoming].fullText, similarity: sug.similarity })),
    }
  })

  const addedRows = plan.added.map((idx) => {
    const i = incoming[idx]
    const subjects = subjectCodesFor(i.appendix, i.unitCode)
    bump(subjects, "added")
    return { id: at(i), text: i.fullText, subjects: codes(subjects) }
  })

  // Links on unchanged items carry too; count them towards their subject.
  for (const m of plan.matches.filter((x) => x.kind === "unchanged")) {
    const n = links(m.existingId)
    if (n) bump(subjectCodesFor(incoming[m.incoming].appendix, incoming[m.incoming].unitCode), "carriedLinks", n)
  }

  const flaggedLinks =
    reworded.filter((m) => m.needsReview).reduce((n, m) => n + links(m.existingId), 0) +
    plan.removed.reduce((n, r) => n + links(r.existingId), 0)
  const carriedLinks = plan.matches.filter((m) => !m.needsReview).reduce((n, m) => n + links(m.existingId), 0)

  // Subjects pointing at a unit the new compilation doesn't have (renamed or withdrawn code).
  const bundledUnits = new Set(c.bundled.units.map((u) => `${appendixOf(u.number)}/${u.code}`))
  const missingUnits = Object.entries(SUBJECT_MOS_UNITS).flatMap(([subjectId, def]) =>
    def.codes.filter((code) => !bundledUnits.has(`${def.appendix}/${code}`)).map((code) => ({ subjectId, code })),
  )

  const subjectOrder = SUBJECTS.map((x) => x.id)
  return {
    builtAt: c.bundled.source.builtAt,
    fromCompilation: c.stored.compilation ?? null,
    toCompilation: c.bundled.source.compilation,
    toRegistered: c.bundled.source.registered,
    firstLoad: existing.length === 0,
    itemsBefore: existing.filter((e) => !e.retired).length,
    itemsAfter: incoming.length,
    counts: {
      unchanged: plan.matches.filter((m) => m.kind === "unchanged").length,
      moved: moved.length,
      reworded: reworded.length,
      needsReview: reworded.filter((m) => m.needsReview).length,
      added: plan.added.length,
      removed: plan.removed.length,
      restored: plan.matches.filter((m) => m.restored).length,
    },
    flaggedLinks,
    carriedLinks,
    subjects: [...impact.values()]
      .filter((x) => x.moved || x.reworded || x.removed || x.added)
      .sort((a, b) => subjectOrder.indexOf(a.subjectId) - subjectOrder.indexOf(b.subjectId)),
    moved: movedRows.sort((a, b) => b.links - a.links),
    reworded: rewordedRows.sort((a, b) => Number(b.needsReview) - Number(a.needsReview) || b.links - a.links),
    removed: removedRows.sort((a, b) => b.links - a.links),
    added: addedRows,
    missingUnits,
  }
}

/** What applying the bundled data file would do. Writes nothing. */
export async function previewUpdate(): Promise<UpdatePreview & { upToDate: boolean }> {
  const c = await compute()
  const preview = await summarise(c)
  const upToDate = c.stored.builtAt === c.bundled.source.builtAt && c.existing.length > 0
  return { ...preview, upToDate }
}

async function inChunks<T>(list: T[], size: number, run: (item: T) => Promise<unknown>) {
  for (let i = 0; i < list.length; i += size) await Promise.all(list.slice(i, i + size).map(run))
}

type HistoryEntry = { compilation: string | null; unitCode: string; ref: string; fullText: string; change: string; at: string }

/**
 * Applies the bundled data file. `expectedBuiltAt` must match the preview the
 * admin looked at, so nobody approves one change set and applies another.
 *
 * Steps are ordered so a failure part-way can simply be retried: re-running
 * recomputes the plan from whatever state the database is in.
 */
export async function applyUpdate(userId: string, expectedBuiltAt: string) {
  const c = await compute()
  const { bundled, stored, incoming, existing, plan } = c
  if (bundled.source.builtAt !== expectedBuiltAt) {
    throw new UpdateMismatchError("The MOS data changed since you previewed it. Preview it again.")
  }

  const preview = await summarise(c)
  const to = bundled.source.compilation
  const from = stored.compilation ?? null
  const label = to ?? bundled.source.builtAt.slice(0, 10)
  const now = new Date()
  const byId = new Map(existing.map((e) => [e.id, e]))

  // 0. Units: identity is appendix + code, so renumbered units update in place.
  const units = await prisma.mosUnit.findMany({ select: { id: true, number: true, code: true, appendix: true } })
  const unitByKey = new Map(units.map((u) => [`${u.appendix ?? appendixOf(u.number)}/${u.code}`, u]))
  const seenUnits = new Set<string>()
  for (const [order, u] of bundled.units.entries()) {
    const appendix = appendixOf(u.number)
    const key = `${appendix}/${u.code}`
    seenUnits.add(key)
    const data = { number: u.number, appendix, code: u.code, title: u.title, section: u.section, licence: u.licence, reserved: u.reserved, order, compilation: to, retired: false }
    const current = unitByKey.get(key)
    if (current) await prisma.mosUnit.update({ where: { id: current.id }, data })
    else await prisma.mosUnit.create({ data })
  }
  const goneUnits = units.filter((u) => !seenUnits.has(`${u.appendix ?? appendixOf(u.number)}/${u.code}`)).map((u) => u.id)
  if (goneUnits.length) await prisma.mosUnit.updateMany({ where: { id: { in: goneUnits } }, data: { retired: true } })

  // 1. New items first, so removal suggestions can point at them.
  const existingKeys = new Set(existing.map((e) => e.key))
  const newIdByIncoming = new Map<number, string>()
  const toCreate = plan.added.map((idx) => {
    const row = incoming[idx]
    let key = `${label}:${row.appendix}/${row.unitCode}:${row.ref}`
    for (let n = 2; existingKeys.has(key); n++) key = `${label}:${row.appendix}/${row.unitCode}:${row.ref}#${n}`
    existingKeys.add(key)
    return { idx, data: { ...row, key, compilation: to, introducedIn: to } }
  })
  for (let i = 0; i < toCreate.length; i += 500) {
    const batch = toCreate.slice(i, i + 500)
    await prisma.mosItem.createMany({ data: batch.map((b) => b.data) })
    const created = await prisma.mosItem.findMany({ where: { key: { in: batch.map((b) => b.data.key) } }, select: { id: true, key: true } })
    const idByKey = new Map(created.map((x) => [x.key, x.id]))
    for (const b of batch) newIdByIncoming.set(b.idx, idByKey.get(b.data.key)!)
  }
  const idForIncoming = (idx: number) => newIdByIncoming.get(idx) ?? plan.matches.find((m) => m.incoming === idx)?.existingId

  // 2. Flag links that need a person: significant rewording, or removal.
  let flaggedLinks = 0
  for (const m of plan.matches.filter((x) => x.kind === "reworded" && x.needsReview)) {
    const e = byId.get(m.existingId)!
    const r = await prisma.mosMapping.updateMany({
      where: { itemId: m.existingId },
      data: {
        needsReview: true,
        reviewReason: "reworded",
        reviewNote: `Reworded in ${label}. It previously read: "${e.fullText}"`,
        suggestedItemIds: [],
        flaggedAt: now,
        reviewedById: null,
        reviewedAt: null,
      },
    })
    flaggedLinks += r.count
  }
  for (const removal of plan.removed) {
    const e = byId.get(removal.existingId)!
    const suggestions = removal.suggestions.map((s) => idForIncoming(s.incoming)).filter((id): id is string => !!id)
    const r = await prisma.mosMapping.updateMany({
      where: { itemId: removal.existingId },
      data: {
        needsReview: true,
        reviewReason: "removed",
        reviewNote: `${mosId(e.unitCode, e.ref)} is not in ${label}.`,
        suggestedItemIds: suggestions,
        flaggedAt: now,
        reviewedById: null,
        reviewedAt: null,
      },
    })
    flaggedLinks += r.count
  }
  // An item that's back clears the "removed" flag it caused.
  const restored = plan.matches.filter((m) => m.restored).map((m) => m.existingId)
  if (restored.length) {
    await prisma.mosMapping.updateMany({
      where: { itemId: { in: restored }, reviewReason: "removed" },
      data: { needsReview: false, reviewReason: null, reviewNote: null, suggestedItemIds: [] },
    })
  }

  // 3. Matched items take their new position and wording; the old one goes into history.
  const updates = plan.matches
    .map((m) => ({ m, e: byId.get(m.existingId)!, row: incoming[m.incoming] }))
    .filter(({ m, e, row }) =>
      m.kind !== "unchanged" ||
      m.restored ||
      !e.appendix ||
      e.unitNumber !== row.unitNumber ||
      e.topicTitle !== row.topicTitle ||
      e.subtopicTitle !== row.subtopicTitle ||
      e.topicNumber !== row.topicNumber ||
      e.subtopicNumber !== row.subtopicNumber ||
      e.order !== row.order ||
      e.fullText !== row.fullText,
    )
  await inChunks(updates, 50, ({ m, e, row }) => {
    const history = Array.isArray(e.history) ? (e.history as unknown as HistoryEntry[]) : []
    const changedPosition = e.unitCode !== row.unitCode || e.ref !== row.ref
    const changedWords = e.fullText !== row.fullText
    const entry: HistoryEntry | null =
      changedPosition || changedWords || m.restored
        ? { compilation: from, unitCode: e.unitCode, ref: e.ref, fullText: e.fullText, change: m.restored ? "restored" : m.kind, at: now.toISOString() }
        : null
    return prisma.mosItem.update({
      where: { id: e.id },
      data: {
        ...row,
        compilation: to,
        retired: false,
        ...(entry ? { history: [...history, entry] as unknown as Prisma.InputJsonValue } : {}),
      },
    })
  })

  // 4. Items with no counterpart are retired. Their links stay, flagged above.
  const retire = plan.removed.map((r) => r.existingId)
  if (retire.length) await prisma.mosItem.updateMany({ where: { id: { in: retire } }, data: { retired: true } })

  // 5. Record it.
  await prisma.mosRevision.create({
    data: {
      compilation: to,
      registered: bundled.source.registered,
      builtAt: bundled.source.builtAt,
      fromCompilation: from,
      unchanged: preview.counts.unchanged,
      moved: preview.counts.moved,
      reworded: preview.counts.reworded,
      added: preview.counts.added,
      removed: preview.counts.removed,
      restored: preview.counts.restored,
      flaggedLinks,
      // The full change report, so it can be downloaded again later exactly as applied.
      changes: { ...preview, flaggedLinks } as unknown as Prisma.InputJsonObject,
      appliedById: userId,
    },
  })

  const status = {
    compilation: to,
    registered: bundled.source.registered,
    builtAt: bundled.source.builtAt,
    units: bundled.units.filter((u) => !u.reserved).length,
    loadedAt: now.toISOString(),
  }
  await prisma.siteSetting.upsert({
    where: { key: STATUS_KEY },
    create: { key: STATUS_KEY, value: status, updatedById: userId },
    update: { value: status, updatedById: userId },
  })

  unitCache = null
  vectorCache.clear()
  return { ...preview.counts, flaggedLinks }
}

export class UpdateMismatchError extends Error {}

/* -------------------------------------------------------------------------- */
/* Embeddings                                                                  */
/* -------------------------------------------------------------------------- */

export function embeddingText(item: { unitCode: string; ref: string; topicTitle: string; subtopicTitle: string; fullText: string }) {
  return [item.topicTitle, item.subtopicTitle, item.fullText].filter(Boolean).join(" — ")
}

interface VectorEntry {
  id: string
  vector: Float32Array
}

/** Per-subject vectors, kept for the life of the server process. */
const vectorCache = new Map<string, { entries: VectorEntry[]; at: number }>()
const VECTOR_TTL_MS = 10 * 60_000

/**
 * Vectors for a subject's items, embedding any that are missing or stale first
 * (new items, or wording changed by an update). The first suggestion for a
 * subject pays for this; after that it's served from memory.
 */
export async function vectorsForSubject(subjectId: string): Promise<VectorEntry[]> {
  const cached = vectorCache.get(subjectId)
  if (cached && Date.now() - cached.at < VECTOR_TTL_MS) return cached.entries

  const units = await subjectUnitNumbers(subjectId)
  if (!units.length) return []

  const items = await prisma.mosItem.findMany({
    where: { unitNumber: { in: units }, ...notRetired },
    select: { id: true, unitCode: true, ref: true, topicTitle: true, subtopicTitle: true, fullText: true, embedding: true, embeddedHash: true, embeddingModel: true },
  })

  const stale = items.filter((i) => !i.embedding?.length || i.embeddingModel !== EMBEDDING_MODEL || i.embeddedHash !== hash(embeddingText(i)))
  for (let i = 0; i < stale.length; i += 200) {
    const batch = stale.slice(i, i + 200)
    const { embeddings } = await embedMany({ model: EMBEDDING_MODEL, values: batch.map(embeddingText) })
    await Promise.all(
      batch.map((item, j) => {
        item.embedding = embeddings[j]
        return prisma.mosItem.update({
          where: { id: item.id },
          data: { embedding: embeddings[j], embeddingModel: EMBEDDING_MODEL, embeddedHash: hash(embeddingText(item)) },
        })
      }),
    )
  }

  const entries = items.filter((i) => i.embedding?.length).map((i) => ({ id: i.id, vector: normalise(i.embedding) }))
  vectorCache.set(subjectId, { entries, at: Date.now() })
  return entries
}

export function normalise(values: number[]): Float32Array {
  const v = Float32Array.from(values)
  let norm = 0
  for (let i = 0; i < v.length; i++) norm += v[i] * v[i]
  norm = Math.sqrt(norm) || 1
  for (let i = 0; i < v.length; i++) v[i] /= norm
  return v
}

export function dot(a: Float32Array, b: Float32Array) {
  let sum = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) sum += a[i] * b[i]
  return sum
}
