import { createHash, randomInt } from "crypto"

/**
 * Demo access codes: how they're made, normalised and compared.
 *
 * Kept apart from lib/demo/access.ts, which holds the cookie and the database
 * work, so the format can be checked without a server.
 */

export const DEMO_COOKIE = "demo_access"
export const DEFAULT_TTL_DAYS = 30

/** No I, O, 0 or 1: these get read aloud and typed in from a printout. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

export function newCode() {
  const pick = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")
  return `${pick()}-${pick()}`
}

/** Case and dashes don't matter to someone retyping it from an email. */
export const normaliseCode = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "")

export const hashCode = (raw: string) => createHash("sha256").update(normaliseCode(raw)).digest("hex")

export const codeHint = (raw: string) => normaliseCode(raw).slice(-4)

export type GrantStatus = "active" | "expired" | "revoked"

export function grantStatus(grant: { expiresAt: Date; revokedAt: Date | null }): GrantStatus {
  if (grant.revokedAt) return "revoked"
  if (grant.expiresAt.getTime() < Date.now()) return "expired"
  return "active"
}
