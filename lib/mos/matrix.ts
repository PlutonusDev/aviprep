import type { CoverageDetail } from "@lib/mos/coverage"
import type { LibraryStatus } from "@lib/mos/library"
import { MOS_STATUS_LABELS } from "@lib/mos/subjects"

/**
 * The compliance matrices, as plain rows. CSV and PDF exports both render from
 * here so they always agree. Safe for client and server.
 */

export interface MatrixMeta {
  subjectName: string
  subjectCode: string
  licence: string
  units: string
  compilation: string
  generatedAt: Date
  documentRef: string
  percent: number
  mapped: number
  assessable: number
  missing: number
  lowDensity: number
  excluded: number
  /** Links flagged by a MOS update and not yet reviewed. */
  pendingReviews: number
}

export function matrixMeta(detail: CoverageDetail, library: Pick<LibraryStatus, "compilation" | "registered">, now = new Date()): MatrixMeta {
  const s = detail.summary
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
  return {
    subjectName: s.name,
    subjectCode: s.code,
    licence: s.licence.toUpperCase(),
    units: s.units.filter((u) => !u.reserved).map((u) => `${u.number} ${u.code}`).join(", "),
    compilation: [library.compilation, library.registered && `registered ${library.registered}`].filter(Boolean).join(", ") || "Unknown",
    generatedAt: now,
    documentRef: `AVP-MOS-${s.code}-${stamp}`,
    percent: s.percent,
    mapped: s.mapped,
    assessable: s.assessable,
    missing: s.missing,
    lowDensity: s.lowDensity,
    excluded: s.excluded,
    pendingReviews: detail.reviews?.length ?? 0,
  }
}

export const ITEM_COLUMNS = [
  "Licence",
  "Subject code",
  "Unit",
  "Topic",
  "Sub-topic",
  "MOS element ID",
  "MOS requirement",
  "AviPrep learning (course › module › lesson)",
  "Live questions",
  "Status",
] as const

export function itemMatrixRows(detail: CoverageDetail): string[][] {
  const s = detail.summary
  const unitTitle = new Map(s.units.map((u) => [u.number, `${u.number} ${u.code} ${u.title}`]))
  return detail.items.map((i) => [
    s.licence.toUpperCase(),
    s.code,
    unitTitle.get(i.unitNumber) ?? `${i.unitNumber} ${i.unitCode}`,
    `${i.topicNumber}. ${i.topicTitle}`,
    [i.subtopicNumber, i.subtopicTitle].filter(Boolean).join(" "),
    i.mosId,
    i.fullText,
    i.lessons
      .filter((l) => l.live)
      .map((l) => `${l.courseTitle} › ${l.moduleTitle} › ${l.title}`)
      .join("\n"),
    String(i.liveQuestions),
    i.status === "excluded" && i.excludedReason ? `Excluded: ${i.excludedReason}` : MOS_STATUS_LABELS[i.status],
  ])
}

export const MODULE_COLUMNS = ["Course", "Module", "Lesson", "Primary MOS element", "All mapped MOS elements"] as const

/** AviPrep structure → MOS. Only live courses belong in a document handed to an operator. */
export function moduleMatrixRows(detail: CoverageDetail): string[][] {
  return detail.modules
    .filter((m) => m.courseLive)
    .flatMap((m) =>
      m.lessons.map((l) => [m.courseTitle, m.moduleTitle, l.title, l.primaryMosId ?? "Not mapped", l.mosIds.join(", ")]),
    )
}

/** Coverage per Schedule topic, for the summary table. */
export function topicSummaryRows(detail: CoverageDetail): string[][] {
  const groups = new Map<string, { label: string; assessable: number; mapped: number; low: number }>()
  for (const i of detail.items) {
    const key = `${i.unitNumber}:${i.topicNumber}`
    const g = groups.get(key) ?? { label: `${i.unitCode} ${i.topicNumber}. ${i.topicTitle}`, assessable: 0, mapped: 0, low: 0 }
    if (i.status !== "excluded") g.assessable++
    if (i.status === "covered" || i.status === "low") g.mapped++
    if (i.status === "low") g.low++
    groups.set(key, g)
  }
  return [...groups.values()].map((g) => [
    g.label,
    String(g.assessable),
    String(g.mapped),
    String(g.assessable - g.mapped),
    g.assessable ? `${Math.floor((g.mapped / g.assessable) * 100)}%` : "–",
  ])
}

export function toCsv(header: readonly string[], rows: string[][]) {
  const cell = (value: string) => {
    // Neutralise spreadsheet formulas in text that came from content.
    const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
  }
  // BOM so Excel opens UTF-8 (the "›" and en dashes) correctly.
  return "\uFEFF" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n")
}
