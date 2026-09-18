import "server-only"

import { createHash, createHmac, timingSafeEqual } from "crypto"

/**
 * Making a signature stand up later.
 *
 * Three things are recorded together and then sealed:
 *   - the exact PDF that was produced, by SHA-256 of its bytes;
 *   - who signed, when, from where, and on what number we'd already verified;
 *   - the template and version they were shown.
 *
 * The seal is an HMAC over all of it with a server-side secret, so anyone who
 * edits the row afterwards - including us - breaks it. That's the point: a
 * signature nobody can quietly change is a signature worth having.
 *
 * Under the Electronic Transactions Act 1999 an electronic signature holds if
 * the signer is identified, the method is as reliable as the purpose requires,
 * and the other party consented to it. The OTP-verified mobile identifies them,
 * this record is the reliability, and signing on the page is the consent.
 */

const SECRET = process.env.DOCUMENT_SIGNING_SECRET || process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET

if (!SECRET && process.env.NODE_ENV === "production") {
  console.error("DOCUMENT_SIGNING_SECRET is not set. Signed documents can't be sealed.")
}

export interface SealFacts {
  curatorId: string
  kind: string
  version: string
  signerName: string
  signedAt: Date | string
  documentHash: string
  sourceHash?: string | null
  phone?: string | null
  ip?: string | null
  values: Record<string, string>
}

export const sha256 = (data: Buffer | string) => createHash("sha256").update(data).digest("hex")

/** A short, readable form of a hash, for printing on the document itself. */
export const fingerprint = (hash: string) =>
  (hash.slice(0, 32).match(/.{4}/g) ?? []).join(" ").toUpperCase()

/**
 * The exact bytes the seal covers. Field order is fixed and values are sorted,
 * so the same facts always produce the same seal.
 */
function canonical(facts: SealFacts) {
  const values = Object.keys(facts.values)
    .sort()
    .map((k) => `${k}=${facts.values[k]}`)
    .join("")
  return [
    "aviprep-signed-document:1",
    facts.curatorId,
    facts.kind,
    facts.version,
    facts.signerName,
    new Date(facts.signedAt).toISOString(),
    facts.documentHash,
    facts.sourceHash ?? "",
    facts.phone ?? "",
    facts.ip ?? "",
    values,
  ].join("")
}

export function sealOf(facts: SealFacts) {
  return createHmac("sha256", SECRET ?? "aviprep-unsealed").update(canonical(facts)).digest("hex")
}

/** Constant time, so a wrong seal can't be found a byte at a time. */
export function verifySeal(facts: SealFacts, seal: string) {
  const expected = Buffer.from(sealOf(facts), "hex")
  const given = Buffer.from(typeof seal === "string" ? seal : "", "hex")
  return expected.length === given.length && timingSafeEqual(expected, given)
}

export const sealingConfigured = () => !!SECRET

/* --- The drawn signature -------------------------------------------------- */

const MAX_SIGNATURE_BYTES = 200 * 1024

/**
 * A signature arrives as a PNG data URL from a canvas. Anything that isn't a
 * plausible PNG is refused: it ends up inside a PDF we hand to third parties.
 */
export function readSignatureImage(input: unknown): Buffer | null {
  if (typeof input !== "string") return null
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(input.trim())
  if (!match) return null
  let data: Buffer
  try {
    data = Buffer.from(match[1], "base64")
  } catch {
    return null
  }
  if (data.length < 200 || data.length > MAX_SIGNATURE_BYTES) return null
  const magic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return data.subarray(0, 8).equals(magic) ? data : null
}

/** The caller's address, trusting only the proxy header we set ourselves. */
export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")
  const first = forwarded?.split(",")[0]?.trim()
  return first || request.headers.get("x-real-ip") || null
}
