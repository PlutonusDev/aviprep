import "server-only"

import { readFile } from "fs/promises"
import path from "path"
import { jsPDF } from "jspdf"
import { BUSINESS } from "@lib/finance/business"
import { displayValue, fieldsOf, type DocumentTemplate, type Values } from "./templates"

/**
 * The signed document as an A4 PDF, on the AviPrep letterhead in Inter, laid
 * out from the same blocks the curator filled in on screen.
 *
 * The last page carries the signature and the evidence beside it: who signed,
 * when, from where, and on what number. A copy handed to an accountant or a
 * tribunal should answer its own questions without anything attached to it.
 */

type RGB = [number, number, number]
const C = {
  orange: [247, 134, 1] as RGB,
  orangeInk: [180, 95, 0] as RGB,
  blue: [27, 95, 153] as RGB,
  ink: [15, 23, 42] as RGB,
  text: [51, 65, 85] as RGB,
  muted: [100, 116, 139] as RGB,
  line: [226, 232, 240] as RGB,
  panel: [248, 250, 252] as RGB,
  warm: [255, 247, 236] as RGB,
  white: [255, 255, 255] as RGB,
}

const W = 210
const H = 297
const M = 20
const CONTENT = W - M * 2
/** Below the letterhead on page one, below the margin on the rest. */
const TOP = 50
const CONT_TOP = 28
const BOTTOM = H - 20

// The turbopackIgnore markers stop the bundler tracing the whole project into
// the server output because of these runtime reads (see lib/uploads.ts).
const ROOT = /*turbopackIgnore: true*/ process.cwd()
const ASSETS = {
  letterhead: path.join(/*turbopackIgnore: true*/ ROOT, "docs", "brand", "letterhead", "aviprep-letterhead-header.png"),
  regular: path.join(/*turbopackIgnore: true*/ ROOT, "docs", "contractors", "source", "Inter-400.ttf"),
  bold: path.join(/*turbopackIgnore: true*/ ROOT, "docs", "contractors", "source", "Inter-600.ttf"),
}

let assetCache: Promise<{ letterhead: string | null; regular: string | null; bold: string | null }> | null = null

function loadAssets() {
  assetCache ??= Promise.all(
    [ASSETS.letterhead, ASSETS.regular, ASSETS.bold].map((file) =>
      readFile(/*turbopackIgnore: true*/ file)
        .then((b) => b.toString("base64"))
        .catch((error) => {
          console.error("Signing asset missing:", file, error)
          return null
        }),
    ),
  ).then(([letterhead, regular, bold]) => ({ letterhead, regular, bold }))
  return assetCache
}

const longDate = (value: Date) =>
  value.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Sydney" })
const stamp = (value: Date) =>
  `${value.toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short", timeZone: "Australia/Sydney" })} AEST/AEDT`

export interface SignedFacts {
  signerName: string
  signedAt: Date
  ip?: string | null
  phone?: string | null
  userAgent?: string | null
  documentId?: string | null
}

export async function renderSignedDocument({
  template,
  values,
  signature,
  facts,
}: {
  template: DocumentTemplate
  values: Values
  /** The drawn signature, as PNG bytes. */
  signature: Buffer
  facts: SignedFacts
}): Promise<Buffer> {
  const assets = await loadAssets()
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true })
  doc.setProperties({ title: `${template.title} — ${facts.signerName}`, author: "AviPrep", creator: "AviPrep" })

  const font = assets.regular && assets.bold ? "Inter" : "helvetica"
  if (assets.regular && assets.bold) {
    doc.addFileToVFS("Inter-400.ttf", assets.regular)
    doc.addFont("Inter-400.ttf", "Inter", "normal")
    doc.addFileToVFS("Inter-600.ttf", assets.bold)
    doc.addFont("Inter-600.ttf", "Inter", "bold")
  }

  let y = TOP
  let page = 1

  const write = (
    value: string | string[],
    x: number,
    at: number,
    {
      size = 9,
      bold = false,
      color = C.text,
      align = "left",
      maxWidth,
    }: { size?: number; bold?: boolean; color?: RGB; align?: "left" | "right" | "center"; maxWidth?: number } = {},
  ) => {
    doc.setFont(font, bold ? "bold" : "normal")
    doc.setFontSize(size)
    doc.setTextColor(...color)
    doc.text(value, x, at, { align, maxWidth })
  }

  const lines = (value: string, size: number, width: number) => {
    doc.setFont(font, "normal")
    doc.setFontSize(size)
    return doc.splitTextToSize(value, width) as string[]
  }

  function header() {
    if (assets.letterhead) doc.addImage(`data:image/png;base64,${assets.letterhead}`, "PNG", 0, 0, W, 40, "lh", "FAST")
  }

  function footer() {
    doc.setDrawColor(...C.line)
    doc.setLineWidth(0.2)
    doc.line(M, H - 14, W - M, H - 14)
    write(`${template.title} · ${facts.signerName}`, M, H - 10, { size: 7, color: C.muted })
    write(`Page ${page}`, W - M, H - 10, { size: 7, color: C.muted, align: "right" })
  }

  /** Later pages get the brand rule rather than the full letterhead. */
  function continuationHeader() {
    doc.setFillColor(...C.blue)
    doc.rect(0, 0, W, 2.2, "F")
    doc.setFillColor(...C.orange)
    doc.rect(0, 0, 50, 2.2, "F")
    write(template.title, M, 12, { size: 8, bold: true, color: C.ink })
    write(template.subtitle, W - M, 12, { size: 8, color: C.muted, align: "right" })
  }

  function newPage() {
    footer()
    doc.addPage()
    page += 1
    continuationHeader()
    y = CONT_TOP
  }

  /** Makes room for `height` mm, starting a page if there isn't any. */
  function room(height: number) {
    if (y + height > BOTTOM) newPage()
  }

  header()

  // --- Title ---------------------------------------------------------------
  // A long agreement name is stepped down a size before it's allowed to wrap,
  // so it stays one line where it can and never runs off the margin.
  doc.setFont(font, "bold")
  const titleSize = [24, 21, 18].find((size) => {
    doc.setFontSize(size)
    return doc.getTextWidth(template.title) <= CONTENT
  })
  doc.setFontSize(titleSize ?? 18)
  const titleRows = doc.splitTextToSize(template.title, CONTENT) as string[]
  const titleLead = (titleSize ?? 18) * 0.42
  titleRows.forEach((row, i) => write(row, M, y + i * titleLead, { size: titleSize ?? 18, bold: true, color: C.ink }))
  y += (titleRows.length - 1) * titleLead + 8
  write(template.subtitle, M, y, { size: 10.5, color: C.muted })
  y += 5
  doc.setFillColor(...C.orange)
  doc.rect(M, y, 14, 1, "F")
  y += 9

  // --- Blocks --------------------------------------------------------------
  for (const block of template.blocks) {
    if (block.kind === "heading") {
      room(14)
      y += 3
      write(block.text.toUpperCase(), M, y, { size: 7.5, bold: true, color: C.orangeInk })
      y += 5.5
      continue
    }

    if (block.kind === "text") {
      const rows = lines(block.text, 9, CONTENT)
      room(rows.length * 4.4 + 3)
      write(rows, M, y, { size: 9, color: C.text })
      y += rows.length * 4.4 + 3
      continue
    }

    if (block.kind === "list") {
      const plain = block.marker === "plain"
      for (const item of block.items) {
        const rows = lines(item, 9, CONTENT - (plain ? 5 : 6))
        room(rows.length * 4.4 + 2)
        if (!plain) {
          doc.setFillColor(...C.orange)
          doc.circle(M + 1.4, y - 1.4, 0.8, "F")
        }
        write(rows, M + (plain ? 5 : 6), y, { size: 9, color: C.text })
        y += rows.length * 4.4 + 1.8
      }
      y += 2
      continue
    }

    // A numbered clause. The reference hangs in the margin so a reader
    // skimming for "3.4" finds it down the left edge rather than mid-sentence.
    if (block.kind === "clause") {
      const rows = lines(block.text, 9, CONTENT - 14)
      room(rows.length * 4.4 + 8)
      write(block.ref, M, y, { size: 9, bold: true, color: C.orangeInk })
      write(block.title, M + 14, y, { size: 9, bold: true, color: C.ink })
      y += 4.8
      write(rows, M + 14, y, { size: 9, color: C.text })
      y += rows.length * 4.4 + 3
      continue
    }

    if (block.kind === "formula") {
      const rows = lines(block.text, 9, CONTENT - 16)
      const height = rows.length * 4.6 + 6
      room(height + 3)
      doc.setFillColor(...C.panel)
      doc.roundedRect(M + 14, y - 4.5, CONTENT - 14, height, 2, 2, "F")
      rows.forEach((row, i) => write(row, M + 14 + (CONTENT - 14) / 2, y + i * 4.6, { size: 9, bold: true, color: C.ink, align: "center" }))
      y += height + 2
      continue
    }

    if (block.kind === "note") {
      const rows = lines(block.text, 8.4, CONTENT - 11)
      const height = rows.length * 4.1 + 7
      room(height + 3)
      doc.setFillColor(...C.warm)
      doc.roundedRect(M, y - 4.5, CONTENT, height, 2.5, 2.5, "F")
      doc.setFillColor(...C.orange)
      doc.roundedRect(M + 3.5, y - 3, 0.9, height - 3, 0.45, 0.45, "F")
      write(rows, M + 7.5, y, { size: 8.4, color: C.text })
      y += height + 1
      continue
    }

    // Filled fields, as label-over-value pairs on a tinted panel.
    for (const field of block.fields) {
      const shown = displayValue(field, values[field.id])
      const rows = lines(shown, 10, CONTENT - 9)
      const height = 8 + rows.length * 4.6
      room(height + 2)
      doc.setFillColor(...C.panel)
      doc.roundedRect(M, y - 4, CONTENT, height, 2, 2, "F")
      write(field.label.toUpperCase(), M + 4.5, y, { size: 6.6, bold: true, color: C.muted })
      write(rows, M + 4.5, y + 5.2, { size: 10, bold: true, color: shown === "—" ? C.muted : C.ink })
      y += height + 2
    }
    y += 1
  }

  // --- Declaration and signature, kept together ---------------------------
  const declRows = lines(template.declaration, 9, CONTENT - 11)
  // Declaration, signature and evidence belong together: an orphaned evidence
  // box on its own page reads like an afterthought rather than the record.
  room(declRows.length * 4.4 + 104)

  y += 3
  doc.setFillColor(...C.panel)
  doc.roundedRect(M, y - 4.5, CONTENT, declRows.length * 4.4 + 8, 2.5, 2.5, "F")
  doc.setFillColor(...C.blue)
  doc.roundedRect(M + 3.5, y - 3, 0.9, declRows.length * 4.4 + 5, 0.45, 0.45, "F")
  write(declRows, M + 7.5, y, { size: 9, color: C.ink })
  y += declRows.length * 4.4 + 9

  // The signature itself, on a ruled line, the way it would be on paper.
  const sigW = 62
  const sigH = 22
  try {
    doc.addImage(`data:image/png;base64,${signature.toString("base64")}`, "PNG", M, y, sigW, sigH, undefined, "FAST")
  } catch (error) {
    console.error("Couldn't place the signature image:", error)
  }
  y += sigH
  doc.setDrawColor(...C.ink)
  doc.setLineWidth(0.3)
  doc.line(M, y, M + sigW + 8, y)
  doc.line(W - M - 52, y, W - M, y)
  y += 4.6
  write(facts.signerName, M, y, { size: 10, bold: true, color: C.ink })
  write(longDate(facts.signedAt), W - M, y, { size: 10, bold: true, color: C.ink, align: "right" })
  y += 4
  write("Signed by the Contractor, electronically", M, y, { size: 7.4, color: C.muted })
  write("Date", W - M, y, { size: 7.4, color: C.muted, align: "right" })
  y += 8

  // --- Evidence ------------------------------------------------------------
  const evidence: [string, string][] = [
    ["Signed at", stamp(facts.signedAt)],
    ["Mobile verified by SMS", facts.phone ?? "—"],
    ["IP address", facts.ip ?? "—"],
    ["Template version", `${template.kind} ${template.version}`],
  ]
  const evHeight = 11 + evidence.length * 4.4
  room(evHeight + 4)
  doc.setDrawColor(...C.line)
  doc.setLineWidth(0.2)
  doc.roundedRect(M, y - 4, CONTENT, evHeight, 2.5, 2.5, "S")
  write("HOW THIS SIGNATURE CAN BE CHECKED", M + 4.5, y, { size: 6.6, bold: true, color: C.muted })
  evidence.forEach(([label, value], i) => {
    write(label, M + 4.5, y + 6.2 + i * 4.4, { size: 8, color: C.muted })
    write(value, W - M - 4.5, y + 6.2 + i * 4.4, { size: 8, bold: true, color: C.ink, align: "right" })
  })
  y += evHeight + 3

  const closing = facts.documentId
    ? `Record ${facts.documentId}. AviPrep holds a sealed copy of this record: any later change to it can be detected. Questions to ${BUSINESS.email}.`
    : `AviPrep holds a sealed copy of this record: any later change to it can be detected. Questions to ${BUSINESS.email}.`
  const closeRows = lines(closing, 7.4, CONTENT)
  room(closeRows.length * 3.6 + 2)
  write(closeRows, M, y, { size: 7.4, color: C.muted })

  footer()
  return Buffer.from(doc.output("arraybuffer"))
}

/** Which fields the curator's own record can fill in for them. */
export function prefillFrom(
  template: DocumentTemplate,
  curator: {
    firstName: string
    lastName: string
    legalName?: string | null
    tradingName?: string | null
    email: string
    phone: string
    address?: string | null
    abn?: string | null
  },
): Values {
  const fullName = `${curator.firstName} ${curator.lastName}`.trim()
  const source: Record<string, string | null | undefined> = {
    legalName: curator.legalName || fullName,
    fullName,
    tradingName: curator.tradingName,
    email: curator.email,
    phone: curator.phone,
    address: curator.address,
    abn: curator.abn,
    today: new Date().toISOString().slice(0, 10),
  }
  const values: Values = {}
  for (const field of fieldsOf(template)) {
    const value = field.prefill ? source[field.prefill] : null
    if (value) values[field.id] = value
  }
  return values
}
