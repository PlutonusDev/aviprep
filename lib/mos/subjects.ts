/**
 * Which Schedule 3 units each AviPrep subject is responsible for.
 *
 * A CASA exam covers the "all categories" unit plus the category-specific one
 * (CPL Aerodynamics = CADC + CADA), so most subjects own two units.
 *
 * Units are referenced by code, not number: CASA renumbers units between
 * compilations but keeps their codes. Codes only repeat across appendices
 * (AAGA is ATPL general knowledge in Appendix 1 and the aerial application
 * endorsement in Appendix 2), so each subject also names its appendix.
 *
 * Safe for client and server.
 */

export interface SubjectUnits {
  appendix: string
  codes: string[]
}

const licenceUnits = (codes: string[]): SubjectUnits => ({ appendix: "1", codes })

export const SUBJECT_MOS_UNITS: Record<string, SubjectUnits> = {
  // RPL
  "rpl-agk": licenceUnits(["BAKC", "RBKA"]),
  "rpl-air-law": licenceUnits(["RFRC"]),
  "rpl-met": licenceUnits(["RMTC"]),
  "rpl-radio": licenceUnits(["RARO"]),
  // PPL
  "ppl-agk": licenceUnits(["PAKC", "GNSSC", "PAKA"]),
  "ppl-meteorology": licenceUnits(["PMTC"]),
  "ppl-navigation": licenceUnits(["PNVC"]),
  "ppl-air-law": licenceUnits(["PFRC", "PFRA"]),
  "ppl-human-factors": licenceUnits(["PHFC"]),
  "ppl-operations": licenceUnits(["POPC", "POPA"]),
  // CPL
  "cpl-agk": licenceUnits(["CAKC", "CAKA"]),
  "cpl-aerodynamics": licenceUnits(["CADC", "CADA"]),
  "cpl-meteorology": licenceUnits(["CMTC"]),
  "cpl-navigation": licenceUnits(["CNVC"]),
  "cpl-air-law": licenceUnits(["CFRC", "CFRA"]),
  "cpl-human-factors": licenceUnits(["CHFC"]),
  "cpl-flight-planning": licenceUnits(["COPC", "COPA"]),
  // Instrument rating (Appendix 2, operational ratings)
  "irex-rating": { appendix: "2", codes: ["IREX"] },
  // ATPL
  "atpl-performance": licenceUnits(["APLC", "APLA"]),
  // AAGC/AAGA until F2025C00050, when CASA renamed them.
  "atpl-systems": licenceUnits(["AGKC", "AGKA"]),
  "atpl-air-law": licenceUnits(["AFRC", "AFRA"]),
  "atpl-human-factors": licenceUnits(["AHFC"]),
  "atpl-navigation": licenceUnits(["ANVC", "ANVA"]),
  "atpl-meteorology": licenceUnits(["AMTC", "AMTA"]),
  "atpl-flight-planning": licenceUnits(["AFPC", "AFPA"]),
}

export const MOS_LICENCES = [
  { id: "rpl", label: "RPL" },
  { id: "ppl", label: "PPL" },
  { id: "cpl", label: "CPL" },
  { id: "irex", label: "IREX" },
  { id: "atpl", label: "ATPL" },
] as const

/** Fewer live questions than this on an item is flagged as a content gap. */
export const MIN_QUESTIONS_PER_ITEM = 2

/** The subject's unit codes, in the order they should be listed. */
export const unitsForSubject = (subjectId: string) => SUBJECT_MOS_UNITS[subjectId]?.codes ?? []

export const appendixForSubject = (subjectId: string) => SUBJECT_MOS_UNITS[subjectId]?.appendix ?? "1"

/** A unit's appendix is the first part of its number ("1.3.2" is in Appendix 1). */
export const appendixOf = (unitNumber: string) => unitNumber.split(".")[0]

/** "CADA 2.1.1(a)" - how an item is written everywhere a person reads it. */
export const mosId = (unitCode: string, ref: string) => `${unitCode} ${ref}`

export type MosStatus = "covered" | "low" | "draft" | "missing" | "excluded"

export const MOS_STATUS_LABELS: Record<MosStatus, string> = {
  covered: "Covered",
  low: "Partly covered",
  draft: "Drafts only",
  missing: "Not mapped",
  excluded: "Excluded",
}

/** What a question or lesson sends when it's saved. */
export interface MosLinkInput {
  itemId: string
  primary: boolean
  source: "suggested" | "manual"
  confidence?: number | null
  /** Set when a curator confirms a link a MOS update flagged as reworded. */
  reviewed?: boolean
}

/** A link as the editor shows it. */
export interface MosLink extends MosLinkInput {
  item?: MosItemSummary
  /** Flagged by a MOS update. */
  needsReview?: boolean
  reviewReason?: MosReviewReason | null
  reviewNote?: string | null
}

export interface MosItemSummary {
  id: string
  unitCode: string
  unitNumber: string
  ref: string
  topicTitle: string
  subtopicTitle: string
  fullText: string
  retired?: boolean | null
}

/** Why a MOS update flagged a link. */
export type MosReviewReason = "reworded" | "removed"
