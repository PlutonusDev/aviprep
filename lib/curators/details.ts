/**
 * Curator account details: the rules shared by the join form and the server.
 * Pure, so the client can show the same messages the server enforces.
 */

export const PASSWORD_MIN = 10

/**
 * How a curator knows their stuff. Several can apply (an ATPL who is also a
 * Grade 1 instructor), except the instructor grades, which are one at a time,
 * and "none", which stands alone.
 */
export const CREDENTIALS = [
  { id: "fi-grade-1", label: "Grade 1 Flight Instructor", short: "Grade 1 FI", group: "instructor" },
  { id: "fi-grade-2", label: "Grade 2 Flight Instructor", short: "Grade 2 FI", group: "instructor" },
  { id: "fi-grade-3", label: "Grade 3 Flight Instructor", short: "Grade 3 FI", group: "instructor" },
  { id: "flight-examiner", label: "Flight Examiner", short: "Examiner" },
  { id: "atpl", label: "Air Transport Pilot", short: "ATPL" },
  { id: "cpl", label: "Commercial Pilot", short: "CPL" },
  { id: "ppl", label: "Private Pilot", short: "PPL" },
  { id: "ame", label: "Aircraft Maintenance Engineer", short: "LAME" },
  { id: "atc", label: "Air Traffic Controller", short: "ATC" },
  { id: "none", label: "None of these", short: "None" },
] as const

export type CredentialId = (typeof CREDENTIALS)[number]["id"]

const CREDENTIAL_IDS = new Set<string>(CREDENTIALS.map((c) => c.id))

export const credentialLabel = (id: string, short = false) => {
  const found = CREDENTIALS.find((c) => c.id === id)
  return found ? (short ? found.short : found.label) : id
}

/**
 * The one credential worth putting on a badge, in the order the industry reads
 * them: an examiner outranks an instructor, an instructor outranks a licence.
 * Someone with only "none" gets no credential, just the curator badge.
 */
const CREDENTIAL_RANK: string[] = [
  "flight-examiner",
  "fi-grade-1",
  "fi-grade-2",
  "fi-grade-3",
  "atpl",
  "cpl",
  "atc",
  "ame",
  "ppl",
]

/** The badge shown beside a curator's name, e.g. "Grade 1 FI". Null for none. */
export function highestCredential(credentials: string[] | null | undefined, short = true): string | null {
  if (!credentials?.length) return null
  const best = CREDENTIAL_RANK.find((id) => credentials.includes(id))
  return best ? credentialLabel(best, short) : null
}

/** Applies the rules when a chip is toggled: one instructor grade, and "none" on its own. */
export function toggleCredential(current: string[], id: string): string[] {
  if (current.includes(id)) return current.filter((c) => c !== id)
  if (id === "none") return ["none"]
  if (!CREDENTIAL_IDS.has(id)) return current
  // Picking one instructor grade replaces another.
  const grades = id.startsWith("fi-grade-") ? current.filter((c) => c.startsWith("fi-grade-")) : []
  return [...current.filter((c) => c !== "none" && !grades.includes(c)), id]
}

/** Cleans whatever the client sent into a valid set, or null when it breaks the rules. */
export function readCredentials(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const ids = Array.from(new Set(value.filter((v): v is string => typeof v === "string" && CREDENTIAL_IDS.has(v))))
  if (!ids.length) return null
  if (ids.includes("none") && ids.length > 1) return null
  if (ids.filter((id) => id.startsWith("fi-grade-")).length > 1) return null
  return CREDENTIALS.map((c) => c.id as string).filter((id) => ids.includes(id))
}

export interface CuratorDetails {
  firstName: string
  lastName: string
  phone: string
}

export type DetailErrors = Partial<Record<keyof CuratorDetails | "password" | "credentials", string>>

export const CREDENTIALS_ERROR = "Pick at least one, or None of these."

const tidy = (value: unknown) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "")

/** 0412 345 678 / 61412345678 / +61412345678 -> +61412345678. Null if not an AU mobile. */
export function australianMobile(phone: string): string | null {
  const digits = (phone || "").replace(/[^\d+]/g, "")
  const match = digits.match(/^(?:\+?61|0)(4\d{8})$/)
  return match ? `+61${match[1]}` : null
}

/** +61412345678 -> 0412 345 678, for showing a number back to its owner. */
export function formatMobile(phone: string | null | undefined): string {
  const e164 = australianMobile(phone ?? "")
  if (!e164) return phone ?? ""
  const local = `0${e164.slice(3)}`
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`
}

export function readDetails(body: Record<string, unknown>): CuratorDetails {
  return { firstName: tidy(body.firstName), lastName: tidy(body.lastName), phone: tidy(body.phone) }
}

export function checkDetails(details: CuratorDetails): DetailErrors {
  const errors: DetailErrors = {}
  if (!details.firstName) errors.firstName = "Enter your first name."
  else if (details.firstName.length > 60) errors.firstName = "That's a bit long."
  if (!details.lastName) errors.lastName = "Enter your last name."
  else if (details.lastName.length > 60) errors.lastName = "That's a bit long."
  if (!details.phone) errors.phone = "Enter your mobile number."
  else if (!australianMobile(details.phone)) errors.phone = "Enter an Australian mobile, starting 04."
  return errors
}

export function checkPassword(password: unknown, email?: string): string | null {
  if (typeof password !== "string" || password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`
  if (password.length > 200) return "That password is too long."
  if (email && password.toLowerCase().includes(email.split("@")[0].toLowerCase()) && email.split("@")[0].length >= 4) {
    return "Don't include your email in your password."
  }
  return null
}

export function isEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254
}
