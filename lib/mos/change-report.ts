/**
 * The compliance record of a Schedule 3 update. Built before an update is
 * applied (so it can be reviewed and downloaded first) and stored with the
 * applied revision. Safe for client and server.
 */

export interface ContentRef {
  type: "question" | "lesson"
  label: string
  /** Course › module for lessons. */
  context: string | null
  live: boolean
}

export interface SubjectImpact {
  subjectId: string
  code: string
  name: string
  moved: number
  reworded: number
  removed: number
  added: number
  carriedLinks: number
  flaggedLinks: number
}

export interface ChangeReport {
  builtAt: string
  fromCompilation: string | null
  toCompilation: string | null
  toRegistered: string | null
  firstLoad: boolean
  itemsBefore: number
  itemsAfter: number
  counts: { unchanged: number; moved: number; reworded: number; needsReview: number; added: number; removed: number; restored: number }
  /** Links that go to review. */
  flaggedLinks: number
  /** Links that carry over untouched. */
  carriedLinks: number
  subjects: SubjectImpact[]
  moved: { from: string; to: string; subjects: string[]; links: number }[]
  reworded: {
    id: string
    from: string
    to: string
    before: string
    after: string
    similarity: number
    needsReview: boolean
    subjects: string[]
    links: number
    content: ContentRef[]
  }[]
  removed: {
    id: string
    text: string
    subjects: string[]
    links: number
    content: ContentRef[]
    /** Where the links were sent instead, once that was decided. */
    movedTo: string | null
    /** Current items offered as a destination while an update is being reviewed. */
    candidates?: { id: string; text: string }[]
  }[]
  added: { id: string; text: string; subjects: string[] }[]
  /** Subject units the new compilation doesn't have. */
  missingUnits: { subjectId: string; code: string }[]
}

export interface ReportStatus {
  kind: "preview" | "applied"
  appliedAt?: string | null
  appliedBy?: string | null
}

const stamp = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`

export function changeReportRef(report: ChangeReport, status: ReportStatus, now = new Date()) {
  const when = status.kind === "applied" && status.appliedAt ? new Date(status.appliedAt) : now
  const to = (report.toCompilation ?? "BUILD").replace(/[^A-Za-z0-9]/g, "")
  return `AVP-MOS-CHG-${to}-${stamp(when)}${status.kind === "preview" ? "-PREVIEW" : ""}`
}

const contentList = (refs: ContentRef[]) =>
  refs.map((c) => `${c.type === "question" ? "Question" : "Lesson"}${c.live ? "" : " (draft)"}: ${c.context ? `${c.context} › ` : ""}${c.label}`).join("\n")

export const CHANGE_COLUMNS = [
  "Change",
  "Previous MOS ID",
  "New MOS ID",
  "Subjects",
  "Previous wording",
  "New wording",
  "Wording match",
  "Linked content",
  "Action",
  "Affected AviPrep content",
  "Links moved to",
] as const

/** One row per changed item, for the CSV. */
export function changeRows(report: ChangeReport): string[][] {
  const rows: string[][] = []
  for (const r of report.removed) {
    rows.push([
      "Removed",
      r.id,
      "",
      r.subjects.join(", "),
      r.text,
      "",
      "",
      String(r.links),
      !r.links ? "None" : r.movedTo ? "Links moved" : "Links flagged for review",
      contentList(r.content),
      r.movedTo ?? "",
    ])
  }
  for (const r of report.reworded) {
    rows.push([
      "Reworded",
      r.from,
      r.to,
      r.subjects.join(", "),
      r.before,
      r.after,
      `${Math.round(r.similarity * 100)}%`,
      String(r.links),
      !r.links ? "None" : r.needsReview ? "Links flagged for review" : "Minor change, links kept",
      contentList(r.content),
      "",
    ])
  }
  for (const m of report.moved) {
    rows.push(["Renumbered or moved", m.from, m.to, m.subjects.join(", "), "", "", "100%", String(m.links), m.links ? "Links kept" : "None", "", ""])
  }
  for (const a of report.added) {
    rows.push(["New", "", a.id, a.subjects.join(", "), "", a.text, "", "0", "Needs content", "", ""])
  }
  return rows
}
