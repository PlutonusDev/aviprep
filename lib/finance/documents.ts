import "server-only"

import { readFile } from "fs/promises"
import path from "path"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { INVOICE_KIND_LABELS, TAX_STATUS_LABELS, aud, formatAbn } from "./money"
import type { StatementSnapshot } from "./payouts"

/**
 * Royalty statements and RCTIs as A4 PDFs, on the AviPrep letterhead in Inter.
 * The same file is shown in the preview tab and attached to the email.
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
const M = 20
const CONTENT = W - M * 2

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
          console.error("Document asset missing:", file, error)
          return null
        }),
    ),
  ).then(([letterhead, regular, bold]) => ({ letterhead, regular, bold }))
  return assetCache
}

const date = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Sydney" })
const points = (n: number) => n.toLocaleString("en-AU")
const percent = (n: number) => `${n < 10 ? n.toFixed(2) : n.toFixed(1)}%`

async function createDoc(title: string, draft: boolean) {
  const assets = await loadAssets()
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true })
  doc.setProperties({ title, author: "AviPrep", creator: "AviPrep" })

  const font = assets.regular && assets.bold ? "Inter" : "helvetica"
  if (assets.regular && assets.bold) {
    doc.addFileToVFS("Inter-400.ttf", assets.regular)
    doc.addFont("Inter-400.ttf", "Inter", "normal")
    doc.addFileToVFS("Inter-600.ttf", assets.bold)
    doc.addFont("Inter-600.ttf", "Inter", "bold")
  }

  const letterhead = () => {
    if (assets.letterhead) doc.addImage(`data:image/png;base64,${assets.letterhead}`, "PNG", 0, 0, W, 40, "letterhead", "FAST")
    if (draft) {
      doc.setFillColor(...C.orange)
      doc.roundedRect(W - M - 30, 44, 30, 6.5, 3.25, 3.25, "F")
      text("DRAFT PREVIEW", W - M - 15, 48.4, { size: 7, bold: true, color: C.white, align: "center" })
    }
  }

  function text(
    value: string | string[],
    x: number,
    y: number,
    { size = 9, bold = false, color = C.text, align = "left", maxWidth, spacing }: { size?: number; bold?: boolean; color?: RGB; align?: "left" | "right" | "center"; maxWidth?: number; spacing?: number } = {},
  ) {
    doc.setFont(font, bold ? "bold" : "normal")
    doc.setFontSize(size)
    doc.setTextColor(...color)
    doc.text(value, x, y, { align, maxWidth, charSpace: spacing })
  }

  /** Wrapped paragraph; returns the y below it. */
  function paragraph(value: string, x: number, y: number, width: number, { size = 8.5, color = C.muted, lineHeight = 1.45 } = {}) {
    doc.setFont(font, "normal")
    doc.setFontSize(size)
    const lines = doc.splitTextToSize(value, width) as string[]
    text(lines, x, y, { size, color })
    return y + lines.length * size * 0.3528 * lineHeight
  }

  function kicker(label: string, y: number) {
    text(label.toUpperCase(), M, y, { size: 7.5, bold: true, color: C.orangeInk, spacing: 0.35 })
  }

  function party(label: string, lines: { value: string; strong?: boolean }[], x: number, y: number, width: number, fill: RGB) {
    const height = 9 + lines.length * 4.6
    doc.setFillColor(...fill)
    doc.roundedRect(x, y, width, height, 2.5, 2.5, "F")
    text(label.toUpperCase(), x + 5, y + 6.2, { size: 6.8, bold: true, color: C.muted, spacing: 0.3 })
    lines.forEach((line, i) =>
      text(line.value, x + 5, y + 11.6 + i * 4.6, { size: line.strong ? 10 : 8.5, bold: !!line.strong, color: line.strong ? C.ink : C.text, maxWidth: width - 10 }),
    )
    return height
  }

  function meta(rows: [string, string][], y: number) {
    rows.forEach(([label, value], i) => {
      text(label, W - M - 42, y + i * 5, { size: 8, color: C.muted, align: "right" })
      text(value, W - M, y + i * 5, { size: 8, bold: true, color: C.ink, align: "right" })
    })
  }

  function breakdownTable(s: StatementSnapshot, startY: number, amountLabel: string) {
    autoTable(doc, {
      startY,
      margin: { left: M, right: M },
      head: [["Subject", "Net revenue", "Royalty pool (25%)", "Points", "Share", amountLabel]],
      body: s.lines.map((l) => [
        l.name,
        aud(l.netCents),
        aud(l.poolCents),
        `${points(l.myPoints)} of ${points(l.totalPoints)}`,
        percent(l.sharePercent),
        aud(l.royaltyCents),
      ]),
      foot: [["Total", aud(s.totals.netCents), aud(s.totals.poolCents), "", "", aud(s.totals.royaltyCents)]],
      theme: "plain",
      styles: { font, fontSize: 8.2, textColor: C.text, cellPadding: { top: 2.6, bottom: 2.6, left: 2.2, right: 2.2 }, lineColor: C.line },
      headStyles: { font, fontStyle: "bold", fontSize: 7.4, textColor: C.muted, fillColor: C.panel },
      footStyles: { font, fontStyle: "bold", textColor: C.ink, fillColor: C.white },
      columnStyles: {
        0: { cellWidth: 52 },
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right", cellWidth: 16 },
        5: { halign: "right", fontStyle: "bold", textColor: C.ink },
      },
      didParseCell: (data) => {
        if (data.section === "head" && data.column.index > 0) data.cell.styles.halign = "right"
        if (data.section === "foot" && data.column.index > 0) data.cell.styles.halign = "right"
      },
      willDrawCell: (data) => {
        // Hairlines between rows, a firmer rule above the total.
        if (data.section === "body") {
          doc.setDrawColor(...C.line)
          doc.setLineWidth(0.2)
          doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height)
        }
        if (data.section === "foot") {
          doc.setDrawColor(...C.ink)
          doc.setLineWidth(0.35)
          doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y)
        }
      },
      didDrawPage: () => letterhead(),
    })
    return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  }

  function finish(footerLabel: string) {
    const pages = doc.getNumberOfPages()
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i)
      text(footerLabel, M, 289, { size: 7, color: C.muted })
      text(`Page ${i} of ${pages}`, W - M, 289, { size: 7, color: C.muted, align: "right" })
    }
    return Buffer.from(doc.output("arraybuffer"))
  }

  letterhead()
  return { doc, font, text, paragraph, kicker, party, meta, breakdownTable, finish }
}

/* --- Statement ----------------------------------------------------------------- */

export async function renderStatement(s: StatementSnapshot, { draft = false, ytd }: { draft?: boolean; ytd?: { label: string; royaltyCents: number } } = {}) {
  const k = await createDoc(`Royalty statement ${s.number}`, draft)
  const { doc, text, paragraph, kicker, party, meta, breakdownTable, finish } = k

  kicker("Royalty statement", 56)
  text(s.periodLabel, M, 66, { size: 22, bold: true, color: C.ink })
  meta(
    [
      ["Statement", s.number],
      ["Issued", date(s.issuedAt)],
      ["Paid by", date(s.dueDate)],
    ],
    draft ? 57 : 54,
  )

  const supplierLines = [
    { value: s.supplier.name, strong: true },
    ...(s.supplier.tradingName ? [{ value: `Trading as ${s.supplier.tradingName}` }] : []),
    { value: s.supplier.abn ? `ABN ${formatAbn(s.supplier.abn)}` : s.supplier.taxStatus ? TAX_STATUS_LABELS[s.supplier.taxStatus] : "Tax status not recorded" },
    { value: s.supplier.email },
  ]
  const recipientLines = [
    { value: s.recipient.name, strong: true },
    { value: `${s.recipient.legalName}` },
    { value: `ABN ${formatAbn(s.recipient.abn)}` },
    { value: s.recipient.email },
  ]
  const half = (W - M * 2 - 6) / 2
  const partyY = 76
  const h = Math.max(party("Paid to", supplierLines, M, partyY, half, C.panel), party("From", recipientLines, M + half + 6, partyY, half, C.panel))

  // The number that matters, with how it's made up beside it.
  const heroY = partyY + h + 7
  const breakdown: [string, number, boolean?][] = [["Royalties", s.totals.royaltyCents]]
  if (s.totals.gstCents) breakdown.push(["GST", s.totals.gstCents])
  if (s.totals.withholdingCents) breakdown.push(["Withheld for the ATO (47%)", -s.totals.withholdingCents])
  const heroH = Math.max(28, 14 + breakdown.length * 5.2)
  doc.setFillColor(...C.warm)
  doc.roundedRect(M, heroY, CONTENT, heroH, 3, 3, "F")
  doc.setFillColor(...C.orange)
  doc.roundedRect(M, heroY, 1.4, heroH, 0.7, 0.7, "F")
  text("Amount payable", M + 7, heroY + 9.5, { size: 9, color: C.text })
  text(aud(s.totals.payableCents), M + 7, heroY + 21, { size: 24, bold: true, color: C.ink })
  breakdown.forEach(([label, cents], i) => {
    const y = heroY + 10 + i * 5.2
    text(label, W - M - 42, y, { size: 8.5, color: C.muted, align: "right" })
    text(cents < 0 ? `−${aud(-cents)}` : aud(cents), W - M - 7, y, { size: 8.5, bold: true, color: C.ink, align: "right" })
  })

  // How it's worked out.
  let y = heroY + heroH + 11
  text("How it’s worked out", M, y, { size: 11, bold: true, color: C.ink })
  y = paragraph("Each subject puts 25% of its net revenue into a royalty pool, shared by everyone’s points on live content. Your share of the pool is your royalty.", M, y + 5.2, CONTENT)

  if (s.lines.length) {
    y = breakdownTable(s, y + 1.5, "Your royalty") + 8
  } else {
    y = paragraph("No live content earned royalties this month.", M, y + 3, CONTENT, { color: C.text }) + 6
  }

  if (y > 240) {
    doc.addPage()
    y = 56
  }

  // Payment, and the year so far.
  const colW = (CONTENT - 6) / 2
  doc.setFillColor(...C.panel)
  const payLines = s.bank
    ? ["Paid through Stripe", `To your account ending ${s.bank.last4}`, ...(s.bank.bankName ? [s.bank.bankName] : [])]
    : ["Paid through Stripe", "Set up payouts from your AviPrep", "dashboard so we can pay you."]
  const boxH = 14 + payLines.length * 4.6
  doc.roundedRect(M, y, colW, boxH, 2.5, 2.5, "F")
  text("PAYMENT", M + 5, y + 6.2, { size: 6.8, bold: true, color: C.muted, spacing: 0.3 })
  payLines.forEach((line, i) => text(line, M + 5, y + 11.8 + i * 4.6, { size: 8.5, color: i === 0 ? C.ink : C.text, bold: i === 0 }))

  if (ytd) {
    doc.setFillColor(...C.panel)
    doc.roundedRect(M + colW + 6, y, colW, boxH, 2.5, 2.5, "F")
    text(`${ytd.label} SO FAR`, M + colW + 11, y + 6.2, { size: 6.8, bold: true, color: C.muted, spacing: 0.3 })
    text(aud(ytd.royaltyCents + s.totals.royaltyCents), M + colW + 11, y + 13.5, { size: 13, bold: true, color: C.ink })
    text("Royalties, including this month", M + colW + 11, y + 18.6, { size: 8, color: C.muted })
  }
  y += boxH + 8

  const notes: string[] = [
    "Net revenue is what AviPrep received for a subject after GST, payment fees and refunds. Points are counted on live content when this statement was made.",
  ]
  if (s.totals.withholdingCents) {
    notes.push(
      "We withheld 47% because we don’t have your ABN or a signed Statement by a supplier. It’s paid to the ATO in your name and counts towards your tax. We’ll send you a payment summary after 30 June.",
    )
  }
  if (s.supplier.taxStatus === "hobby") notes.push("Paid in full under your Statement by a supplier (hobby). No tax was withheld.")
  if (s.invoiceKind !== "none") notes.push(`Your ${INVOICE_KIND_LABELS[s.invoiceKind].toLowerCase()} for this month is attached, number ${s.number}.`)
  if (s.sources.estimated) notes.push("Some sales couldn’t be matched to Stripe, so their fees were estimated.")
  for (const note of notes) y = paragraph(note, M, y, CONTENT, { size: 7.6 }) + 1.8

  return finish(`AviPrep · ABN ${formatAbn(s.recipient.abn)} · Statement ${s.number}`)
}

/* --- RCTI ---------------------------------------------------------------------- */

export async function renderInvoice(s: StatementSnapshot, { draft = false }: { draft?: boolean } = {}) {
  if (s.invoiceKind === "none") return null
  const k = await createDoc(`${INVOICE_KIND_LABELS[s.invoiceKind]} ${s.number}`, draft)
  const { doc, font, text, paragraph, kicker, party, meta, breakdownTable, finish } = k
  const taxInvoice = s.invoiceKind === "rcti"

  kicker(taxInvoice ? "Tax invoice" : "Invoice", 56)
  text(INVOICE_KIND_LABELS[s.invoiceKind], M, 65.5, { size: 17, bold: true, color: C.ink })
  meta(
    [
      ["Invoice", s.number],
      ["Date of issue", date(s.issuedAt)],
      ["For", s.periodLabel],
    ],
    draft ? 57 : 54,
  )

  const half = (W - M * 2 - 6) / 2
  const partyY = 76
  const supplier = [
    { value: s.supplier.name, strong: true },
    ...(s.supplier.tradingName ? [{ value: `Trading as ${s.supplier.tradingName}` }] : []),
    { value: `ABN ${formatAbn(s.supplier.abn)}` },
    ...(s.supplier.address ? [{ value: s.supplier.address }] : []),
    { value: s.supplier.email },
  ]
  const recipient = [
    { value: `${s.recipient.legalName}`, strong: true },
    { value: `Trading as ${s.recipient.name}` },
    { value: `ABN ${formatAbn(s.recipient.abn)}` },
    ...(s.recipient.address ? [{ value: s.recipient.address }] : []),
    { value: s.recipient.email },
  ]
  const h = Math.max(party("Supplier", supplier, M, partyY, half, C.panel), party("Recipient", recipient, M + half + 6, partyY, half, C.panel))

  // The supply.
  let y = partyY + h + 8
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["Description", "Amount (ex GST)", "GST", "Total"]],
    body: [[`Content royalties for ${s.periodLabel}, under the Independent Contractor & Content Royalty Agreement`, aud(s.totals.royaltyCents), aud(s.totals.gstCents), aud(s.totals.royaltyCents + s.totals.gstCents)]],
    theme: "plain",
    styles: { font, fontSize: 8.5, textColor: C.text, cellPadding: 3 },
    headStyles: { font, fontStyle: "bold", fontSize: 7.4, textColor: C.muted, fillColor: C.panel },
    columnStyles: { 0: { cellWidth: 92 }, 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right", fontStyle: "bold", textColor: C.ink } },
    didParseCell: (data) => {
      if (data.section === "head" && data.column.index > 0) data.cell.styles.halign = "right"
    },
  })
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5

  // Totals, right aligned.
  const totals: [string, string, boolean][] = [
    ["Subtotal (ex GST)", aud(s.totals.royaltyCents), false],
    ["GST", aud(s.totals.gstCents), false],
    [taxInvoice ? "Total (inc GST)" : "Total", aud(s.totals.royaltyCents + s.totals.gstCents), true],
  ]
  const boxW = 78
  doc.setFillColor(...C.warm)
  doc.roundedRect(W - M - boxW, y, boxW, 25, 2.5, 2.5, "F")
  totals.forEach(([label, value, strong], i) => {
    const ty = y + 7 + i * 6.4
    text(label, W - M - boxW + 5, ty, { size: strong ? 9.5 : 8.5, bold: strong, color: strong ? C.ink : C.muted })
    text(value, W - M - 5, ty, { size: strong ? 11 : 8.5, bold: true, color: C.ink, align: "right" })
  })
  if (!taxInvoice) {
    paragraph("No GST is charged: the supplier isn’t registered for GST.", M, y + 7, CONTENT - boxW - 8, { size: 8 })
  }
  y += 34

  text("How the amount is worked out", M, y, { size: 10.5, bold: true, color: C.ink })
  y = paragraph("25% of each subject’s net revenue goes into its royalty pool. The supplier’s share is their points on live content as a share of all points in that subject.", M, y + 5, CONTENT)
  y = breakdownTable(s, y + 1.5, "Amount") + 9

  if (y > 250) {
    doc.addPage()
    y = 56
  }

  // The RCTI declaration.
  const declaration = [
    `This is a recipient created ${taxInvoice ? "tax invoice" : "invoice"}, issued by the recipient under the Recipient Created Tax Invoice Agreement between the parties${s.rctiAgreementAt ? ` signed ${date(s.rctiAgreementAt)}` : ""}. The supplier won’t issue their own invoice for this supply.`,
    taxInvoice
      ? "Both parties declare they are registered for GST and will tell the other if that changes."
      : "The recipient is registered for GST. The supplier isn’t, and will tell the recipient if they register.",
    "Tell us within 14 days if anything here is wrong and we’ll issue a corrected invoice.",
  ]
  doc.setFillColor(...C.panel)
  doc.setFont(font, "normal")
  doc.setFontSize(7.8)
  const lineCount = declaration.reduce((n, d) => n + (doc.splitTextToSize(d, CONTENT - 14) as string[]).length, 0)
  const declH = 11 + lineCount * 3.9 + declaration.length * 1.5
  doc.roundedRect(M, y, CONTENT, declH, 2.5, 2.5, "F")
  doc.setFillColor(...C.blue)
  doc.roundedRect(M, y, 1.2, declH, 0.6, 0.6, "F")
  let dy = y + 7
  for (const d of declaration) dy = paragraph(d, M + 7, dy, CONTENT - 14, { size: 7.8, color: C.text, lineHeight: 1.4 }) + 1.5

  return finish(`${INVOICE_KIND_LABELS[s.invoiceKind]} ${s.number}`)
}
