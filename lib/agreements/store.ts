import "server-only"

import { mkdir, readFile, writeFile } from "fs/promises"
import path from "path"
import { nanoid } from "nanoid"
import { prisma } from "@lib/prisma"
import { UPLOAD_ROOT } from "@lib/uploads"
import { DOCUMENT_KINDS, shortNameOf, templateFor, type DocumentKind, type Values } from "./templates"
import { sha256, verifySeal, type SealFacts } from "./seal"

/**
 * Where signed PDFs live and how they come back.
 *
 * They sit under the uploads volume but outside what /uploads serves: that
 * route only hands back images, so a signed tax document can't be guessed at by
 * URL. Everything goes through an authenticated route instead.
 */
const FOLDER = "signed-documents"
const NAME = /^[A-Za-z0-9_-]{6,64}\.pdf$/

export async function saveSignedPdf(data: Buffer) {
  const filename = `${nanoid()}.pdf`
  const dir = path.join(/*turbopackIgnore: true*/ UPLOAD_ROOT, FOLDER)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(/*turbopackIgnore: true*/ dir, filename), data)
  return `${FOLDER}/${filename}`
}

export async function readSignedPdf(stored: string) {
  const filename = path.basename(stored)
  if (!NAME.test(filename)) return null
  try {
    return await readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ UPLOAD_ROOT, FOLDER, filename))
  } catch {
    return null
  }
}

/* --- Which documents a curator actually needs ----------------------------- */

export type DocumentState = "signed" | "needed" | "optional" | "not-needed"

export interface DocumentStatus {
  kind: DocumentKind
  title: string
  shortTitle: string
  subtitle: string
  purpose: string
  appliesWhen?: string
  version: string
  state: DocumentState
  /** Why it's needed now, in their situation. */
  reason: string
  signed?: {
    id: string
    signerName: string
    signedAt: string
    version: string
    /** The signature was made against wording we've since changed. */
    superseded: boolean
    voidedAt?: string | null
  }
}

interface CuratorTax {
  abn?: string | null
  gstRegistered?: boolean | null
  taxStatus?: string | null
}

/**
 * The paperwork list, worked out from what we know about them. Nobody is asked
 * for a Statement by a supplier when they've given us an ABN, and nobody is
 * asked for an RCTI agreement when they aren't registered for GST.
 */
export function documentStatuses(
  curator: CuratorTax,
  signed: {
    id: string
    kind: string
    version: string
    signerName: string
    signedAt: Date
    voidedAt: Date | null
  }[],
): DocumentStatus[] {
  const hasAbn = !!curator.abn?.trim()
  const gst = curator.gstRegistered === true

  return DOCUMENT_KINDS.map((kind) => {
    const template = templateFor(kind)
    // The newest live signature for this document.
    const latest = signed
      .filter((s) => s.kind === kind && !s.voidedAt)
      .sort((a, b) => b.signedAt.getTime() - a.signedAt.getTime())[0]

    let state: DocumentState
    let reason: string

    if (kind === "contractor-agreement") {
      state = latest ? "signed" : "needed"
      reason = latest ? "Signed and on file." : "Nothing gets published or paid until this is signed."
    } else if (kind === "rcti-agreement") {
      if (latest) {
        state = "signed"
        reason = "We raise your tax invoices from here."
      } else if (hasAbn && gst) {
        state = "needed"
        reason = "You're registered for GST, so we need this before we can invoice for you."
      } else if (hasAbn) {
        state = "optional"
        reason = "Only worth signing once you register for GST."
      } else {
        state = "not-needed"
        reason = "Only applies if you get an ABN and register for GST."
      }
    } else {
      if (latest) {
        state = hasAbn ? "not-needed" : "signed"
        reason = hasAbn ? "On file, though your ABN has made it redundant." : "On file, so nothing gets withheld."
      } else if (!hasAbn) {
        state = "needed"
        reason = "Without this or an ABN, 47% of anything over $75 goes to the ATO instead of you."
      } else {
        state = "not-needed"
        reason = "Not needed. You've given us an ABN."
      }
    }

    return {
      kind,
      title: template.title,
      shortTitle: shortNameOf(template),
      subtitle: template.subtitle,
      purpose: template.purpose,
      appliesWhen: template.appliesWhen,
      version: template.version,
      state,
      reason,
      signed: latest
        ? {
            id: latest.id,
            signerName: latest.signerName,
            signedAt: latest.signedAt.toISOString(),
            version: latest.version,
            superseded: latest.version !== template.version,
            voidedAt: null,
          }
        : undefined,
    }
  })
}

/** Everything a curator still has to sign. Used by the studio banner. */
export const outstanding = (statuses: DocumentStatus[]) => statuses.filter((s) => s.state === "needed")

/* --- Verifying a stored signature ----------------------------------------- */

export interface VerifyResult {
  ok: boolean
  sealValid: boolean
  fileFound: boolean
  fileMatches: boolean
  problem?: string
}

/** Re-checks a signature: the seal over the record, and the PDF against its hash. */
export async function verifySignedDocument(id: string): Promise<VerifyResult | null> {
  const row = await prisma.signedDocument.findUnique({ where: { id } })
  if (!row) return null

  const facts: SealFacts = {
    curatorId: row.curatorId,
    kind: row.kind,
    version: row.version,
    signerName: row.signerName,
    signedAt: row.signedAt,
    documentHash: row.documentHash,
    sourceHash: row.sourceHash,
    phone: row.phone,
    ip: row.ip,
    values: (row.values ?? {}) as Values,
  }
  const sealValid = verifySeal(facts, row.seal)

  const file = await readSignedPdf(row.pdfUrl)
  const fileFound = !!file
  const fileMatches = !!file && sha256(file) === row.documentHash

  const problem = !sealValid
    ? "The record doesn't match its seal: something about this signature has been changed since it was made."
    : !fileFound
      ? "The signed PDF is missing from storage."
      : !fileMatches
        ? "The stored PDF doesn't match the hash recorded when it was signed."
        : undefined

  return { ok: sealValid && fileFound && fileMatches, sealValid, fileFound, fileMatches, problem }
}
