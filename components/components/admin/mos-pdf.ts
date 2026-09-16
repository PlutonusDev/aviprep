"use client"

import type { CoverageDetail } from "@lib/mos/coverage"
import type { LibraryStatus } from "@lib/mos/library"
import { MODULE_COLUMNS, itemMatrixRows, matrixMeta, moduleMatrixRows, topicSummaryRows } from "@lib/mos/matrix"
import { MIN_QUESTIONS_PER_ITEM, MOS_STATUS_LABELS, type MosStatus } from "@lib/mos/subjects"
import { BAD, BRAND, GOOD, INK, MUTED, WARN, createPdf, formatDate, pdfSafe, type RGB } from "@/components/admin/pdf-kit"

/**
 * Coverage matrix an operator can attach to a Part 141/142 operations manual
 * or exposition.
 */

const STATUS_COLOURS: Record<MosStatus, RGB> = {
  covered: GOOD,
  low: WARN,
  draft: MUTED,
  missing: BAD,
  excluded: MUTED,
}

export async function downloadMatrixPdf(detail: CoverageDetail, library: Pick<LibraryStatus, "compilation" | "registered">) {
  const meta = matrixMeta(detail, library)
  const kit = await createPdf({
    title: `${meta.subjectName} - Part 61 MOS Schedule 3 mapping`,
    headerLabel: `Part 61 MOS Schedule 3 mapping  |  ${meta.subjectCode}`,
    keywords: `Part 61 MOS, Schedule 3, ${meta.subjectCode}, Part 141, Part 142`,
  })
  const { doc, autoTable, W, M, header, sectionTitle, statBoxes, bullets, lastY, tableDefaults } = kit

  // --- Page 1 -------------------------------------------------------------------
  header()
  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.setTextColor(...INK)
  doc.text(pdfSafe(meta.subjectName), M, 34)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(...MUTED)
  doc.text("AviPrep lessons and questions mapped to Part 61 MOS Schedule 3.", M, 41)

  autoTable(doc, {
    ...tableDefaults,
    startY: 47,
    theme: "plain",
    tableWidth: 150,
    styles: { ...(tableDefaults.styles as object), fontSize: 9, cellPadding: 1.5 },
    columnStyles: { 0: { cellWidth: 48, textColor: MUTED }, 1: { fontStyle: "bold" } },
    body: [
      ["Document reference", meta.documentRef],
      ["Licence", meta.licence],
      ["Subject code", meta.subjectCode],
      ["Schedule 3 units", meta.units],
      ["MOS compilation", meta.compilation],
      ["Generated", formatDate(meta.generatedAt)],
      ["Prepared by", "AviPrep (aviprep.com.au)"],
      ["Status", "Uncontrolled when printed"],
    ].map((r) => r.map(pdfSafe)),
  })

  statBoxes(
    [
      { label: "Mapped", value: `${meta.percent}%`, tone: BRAND },
      { label: "Items mapped", value: `${meta.mapped} of ${meta.assessable}` },
      { label: "Not mapped", value: String(meta.missing + detail.summary.draftOnly) },
      { label: "Low on questions", value: String(meta.lowDensity) },
    ],
    176,
    47,
    W - M - 176,
    2,
  )

  const notesY = Math.max(lastY(), 99) + 8
  sectionTitle("Notes", notesY)
  bullets(
    [
      "Each row in Table 2 is one Schedule 3 item: a lettered paragraph, or an element without paragraphs.",
      `Mapped means at least one live lesson or question covers the item. Covered items also have ${MIN_QUESTIONS_PER_ITEM} or more live questions. Drafts don't count.`,
      "Excluded items aren't assessable on their own. The reason is listed against each.",
      "Every mapping was confirmed by an AviPrep reviewer.",
      "When CASA amends Schedule 3, mappings carry over to renumbered items. Mappings to reworded or removed items are reviewed again.",
      ...(meta.pendingReviews ? [`${meta.pendingReviews} mapping${meta.pendingReviews === 1 ? " is" : "s are"} still being reviewed after the last MOS update.`] : []),
      "AviPrep is a supplementary study resource. This document doesn't replace an operator's approved syllabus. Check it against the current Part 61 MOS on the Federal Register of Legislation.",
    ],
    notesY + 6,
  )

  // --- Table 1 ------------------------------------------------------------------
  doc.addPage()
  header()
  sectionTitle("Table 1. Coverage by topic", 33)
  autoTable(doc, {
    ...tableDefaults,
    startY: 37,
    head: [["Unit and topic", "Items", "Mapped", "Not mapped", "Coverage"]],
    body: topicSummaryRows(detail).map((r) => r.map(pdfSafe)),
    columnStyles: { 1: { halign: "right", cellWidth: 26 }, 2: { halign: "right", cellWidth: 26 }, 3: { halign: "right", cellWidth: 26 }, 4: { halign: "right", cellWidth: 24 } },
  })

  // --- Table 2 ------------------------------------------------------------------
  doc.addPage()
  header()
  sectionTitle("Table 2. Schedule 3 items and AviPrep content", 33)

  const rows = itemMatrixRows(detail)
  const body: (string | { content: string; colSpan: number; styles: Record<string, unknown> })[][] = []
  let group = ""
  detail.items.forEach((item, i) => {
    const key = `${item.unitCode} ${item.topicNumber}. ${item.topicTitle}`
    if (key !== group) {
      group = key
      body.push([{ content: pdfSafe(key), colSpan: 5, styles: { fontStyle: "bold", fillColor: [245, 245, 245] } }])
    }
    const r = rows[i]
    body.push([r[5], r[6], r[7] || "-", r[8], r[9]].map(pdfSafe))
  })

  autoTable(doc, {
    ...tableDefaults,
    startY: 37,
    head: [["MOS ID", "Requirement", "AviPrep lessons", "Live questions", "Status"]],
    body,
    columnStyles: { 0: { cellWidth: 30, fontStyle: "bold" }, 1: { cellWidth: 104 }, 2: { cellWidth: 80 }, 3: { cellWidth: 20, halign: "right" }, 4: { cellWidth: "auto" } },
    didParseCell: (data) => {
      if (data.section !== "body" || data.column.index !== 4 || typeof data.cell.raw !== "string") return
      const raw = String(data.cell.raw)
      const status = (Object.keys(MOS_STATUS_LABELS) as MosStatus[]).find((s) => raw === MOS_STATUS_LABELS[s]) ?? (raw.startsWith("Excluded") ? "excluded" : null)
      if (status) {
        data.cell.styles.textColor = STATUS_COLOURS[status]
        data.cell.styles.fontStyle = status === "excluded" ? "italic" : "bold"
      }
    },
  })

  // --- Table 3 ------------------------------------------------------------------
  const moduleRows = moduleMatrixRows(detail)
  doc.addPage()
  header()
  sectionTitle("Table 3. AviPrep modules and Schedule 3 items", 33)
  if (moduleRows.length) {
    autoTable(doc, {
      ...tableDefaults,
      startY: 37,
      head: [[...MODULE_COLUMNS]],
      body: moduleRows.map((r) => r.map(pdfSafe)),
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 55 }, 2: { cellWidth: 60 }, 3: { cellWidth: 34, fontStyle: "bold" } },
    })
  } else {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...MUTED)
    doc.text("No live courses yet.", M, 42)
  }

  kit.finish(`${meta.documentRef}  |  Generated ${formatDate(meta.generatedAt)}  |  Uncontrolled when printed`, `${meta.documentRef}.pdf`)
}
