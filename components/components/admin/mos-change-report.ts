"use client"

import { CHANGE_COLUMNS, changeReportRef, changeRows, type ChangeReport, type ContentRef, type ReportStatus } from "@lib/mos/change-report"
import { BAD, BRAND, GOOD, INK, MUTED, WARN, createPdf, formatDate, pdfSafe } from "@/components/admin/pdf-kit"

/**
 * Compliance record of a Part 61 MOS Schedule 3 update: what CASA changed, and
 * what it means for AviPrep's mapped content. Available as a preview before
 * the update is applied, and again afterwards from the update history.
 */

const contentCell = (refs: ContentRef[], max = 6) => {
  if (!refs.length) return "-"
  const lines = refs
    .slice(0, max)
    .map((c) => `${c.type === "question" ? "Q" : "Lesson"}${c.live ? "" : " (draft)"}: ${c.context ? `${c.context} > ` : ""}${c.label}`)
  if (refs.length > max) lines.push(`+${refs.length - max} more`)
  return lines.join("\n")
}

function statusLine(status: ReportStatus) {
  if (status.kind === "preview") return "Preview - not applied"
  const when = status.appliedAt ? formatDate(new Date(status.appliedAt)) : "date unknown"
  return `Applied ${when}${status.appliedBy ? ` by ${status.appliedBy}` : ""}`
}

export async function downloadChangeReportPdf(report: ChangeReport, status: ReportStatus) {
  const now = new Date()
  const ref = changeReportRef(report, status, now)
  const from = report.fromCompilation ?? "Previous build"
  const to = report.toCompilation ?? "New build"
  const c = report.counts

  const kit = await createPdf({
    title: `Part 61 MOS Schedule 3 change report - ${from} to ${to}`,
    headerLabel: `Part 61 MOS Schedule 3 change report  |  ${to}`,
    keywords: "Part 61 MOS, Schedule 3, amendment, change report, Part 141, Part 142",
  })
  const { doc, autoTable, W, M, header, sectionTitle, statBoxes, bullets, paragraph, lastY, tableDefaults } = kit

  // --- Page 1: control, status, summary ----------------------------------------
  header()
  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.setTextColor(...INK)
  doc.text("Schedule 3 change report", M, 34)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(...MUTED)
  doc.text(pdfSafe(`${from} to ${to}`), M, 41)

  // Status banner: a preview must never be mistaken for the record of an applied update.
  const preview = status.kind === "preview"
  doc.setFillColor(...(preview ? ([255, 243, 224] as [number, number, number]) : ([232, 245, 236] as [number, number, number])))
  doc.setDrawColor(...(preview ? BRAND : GOOD))
  doc.roundedRect(W - M - 95, 28, 95, 15, 2, 2, "FD")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(...(preview ? WARN : GOOD))
  doc.text(pdfSafe(preview ? "PREVIEW - NOT APPLIED" : "APPLIED"), W - M - 90, 34)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text(pdfSafe(preview ? "Nothing has changed in AviPrep yet." : statusLine(status)), W - M - 90, 39.5)

  autoTable(doc, {
    ...tableDefaults,
    startY: 49,
    theme: "plain",
    tableWidth: 150,
    styles: { ...(tableDefaults.styles as object), fontSize: 9, cellPadding: 1.5 },
    columnStyles: { 0: { cellWidth: 48, textColor: MUTED }, 1: { fontStyle: "bold" } },
    body: [
      ["Document reference", ref],
      ["Previous compilation", from],
      ["New compilation", [to, report.toRegistered && `registered ${report.toRegistered}`].filter(Boolean).join(", ")],
      ["Status", statusLine(status)],
      ["Schedule 3 items", `${report.itemsBefore.toLocaleString()} before, ${report.itemsAfter.toLocaleString()} after`],
      ["Generated", formatDate(now)],
      ["Prepared by", "AviPrep (aviprep.com.au)"],
    ].map((r) => r.map(pdfSafe)),
  })

  statBoxes(
    [
      { label: "Unchanged", value: c.unchanged.toLocaleString() },
      { label: "Renumbered or moved", value: c.moved.toLocaleString() },
      { label: "Reworded", value: c.reworded.toLocaleString(), tone: c.reworded ? WARN : undefined },
      { label: "New", value: c.added.toLocaleString() },
      { label: "Removed", value: c.removed.toLocaleString(), tone: c.removed ? BAD : undefined },
      { label: "Links kept", value: report.carriedLinks.toLocaleString(), tone: GOOD },
      { label: "Links to review", value: report.flaggedLinks.toLocaleString(), tone: report.flaggedLinks ? WARN : undefined },
    ],
    176,
    49,
    W - M - 176,
    2,
  )

  // Unit codes the subject map expects but this compilation lacks: shown where nobody can miss it.
  if (report.missingUnits.length) {
    paragraph(
      `Missing units: ${report.missingUnits.map((m) => `${m.code} (${m.subjectId})`).join(", ")}. These subjects will have no items until their unit codes are updated.`,
      lastY() + 7,
      { color: BAD, width: 150, bold: true, size: 8.5 },
    )
  }

  let y = Math.max(lastY() + (report.missingUnits.length ? 18 : 0), 49 + 4 * 25) + 8
  sectionTitle("Notes", y)
  bullets(
    [
      "Items are matched between compilations by wording, so renumbered items keep their links.",
      "A significant rewording keeps the link and flags it for a reviewer; a minor one doesn't.",
      "Links on a removed item are moved to the item named in section 2, or flagged for re-mapping.",
      "New items start unmapped and show as gaps until content is linked.",
      "A person decides each of these. No link is re-mapped on its own.",
    ],
    y + 6,
  )


  // --- Impact by subject ---------------------------------------------------------
  doc.addPage()
  header()
  sectionTitle("1. Impact by subject", 33)
  if (report.subjects.length) {
    autoTable(doc, {
      ...tableDefaults,
      startY: 37,
      head: [["Subject", "Renumbered", "Reworded", "Removed", "New", "Links kept", "Links to review"]],
      body: report.subjects.map((s) =>
        [`${s.code}  ${s.name}`, s.moved, s.reworded, s.removed, s.added, s.carriedLinks, s.flaggedLinks].map((v) => pdfSafe(String(v))),
      ),
      columnStyles: Object.fromEntries([1, 2, 3, 4, 5, 6].map((i) => [i, { halign: "right", cellWidth: 26 }])),
    })
  } else {
    paragraph("No AviPrep subjects are affected.", 42)
  }

  // --- Removed ------------------------------------------------------------------------
  const section = (title: string) => {
    doc.addPage()
    header()
    sectionTitle(title, 33)
  }

  section(`2. Removed items (${c.removed})`)
  if (report.removed.length) {
    autoTable(doc, {
      ...tableDefaults,
      startY: 37,
      head: [["MOS ID", "Requirement", "Subjects", "Affected AviPrep content", "Links moved to"]],
      body: report.removed.map((r) =>
        [
          r.id,
          r.text,
          r.subjects.join(", ") || "-",
          contentCell(r.content),
          r.movedTo ?? (r.links ? "Flagged for review" : "-"),
        ].map(pdfSafe),
      ),
      columnStyles: { 0: { cellWidth: 28, fontStyle: "bold" }, 1: { cellWidth: 70 }, 2: { cellWidth: 20 }, 3: { cellWidth: 70 } },
    })
  } else {
    paragraph("Nothing was removed.", 42)
  }

  // --- Reworded -----------------------------------------------------------------------
  section(`3. Reworded items (${c.reworded})`)
  if (report.reworded.length) {
    autoTable(doc, {
      ...tableDefaults,
      startY: 37,
      head: [["MOS ID", "Previous wording", "New wording", "Match", "Affected AviPrep content", "Action"]],
      body: report.reworded.map((r) =>
        [
          r.from === r.to ? r.to : `${r.from}\nnow ${r.to}`,
          r.before,
          r.after,
          `${Math.round(r.similarity * 100)}%`,
          contentCell(r.content),
          !r.links ? "None" : r.needsReview ? "Review links" : "Minor, links kept",
        ].map(pdfSafe),
      ),
      columnStyles: { 0: { cellWidth: 28, fontStyle: "bold" }, 1: { cellWidth: 62 }, 2: { cellWidth: 62 }, 3: { cellWidth: 15, halign: "right" }, 4: { cellWidth: 62 } },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 5 && data.cell.raw === "Review links") {
          data.cell.styles.textColor = WARN
          data.cell.styles.fontStyle = "bold"
        }
      },
    })
  } else {
    paragraph("No wording changed.", 42)
  }

  // --- Renumbered ---------------------------------------------------------------------
  section(`4. Renumbered or moved items (${c.moved})`)
  if (report.moved.length) {
    autoTable(doc, {
      ...tableDefaults,
      startY: 37,
      head: [["Previous MOS ID", "New MOS ID", "Subjects", "Links kept"]],
      body: report.moved.map((m) => [m.from, m.to, m.subjects.join(", ") || "-", String(m.links)].map(pdfSafe)),
      columnStyles: { 0: { cellWidth: 50, fontStyle: "bold" }, 1: { cellWidth: 50, fontStyle: "bold" }, 3: { halign: "right", cellWidth: 26 } },
    })
  } else {
    paragraph("Nothing was renumbered.", 42)
  }

  // --- New ----------------------------------------------------------------------------
  section(`5. New items (${c.added})`)
  if (report.added.length) {
    autoTable(doc, {
      ...tableDefaults,
      startY: 37,
      head: [["MOS ID", "Requirement", "Subjects"]],
      body: report.added.map((a) => [a.id, a.text, a.subjects.join(", ") || "Not used by AviPrep"].map(pdfSafe)),
      columnStyles: { 0: { cellWidth: 32, fontStyle: "bold" }, 2: { cellWidth: 40 } },
    })
  } else {
    paragraph("No new items.", 42)
  }

  kit.finish(`${ref}  |  ${statusLine(status)}  |  Generated ${formatDate(now)}`, `${ref}.pdf`)
}

export function downloadChangeReportCsv(report: ChangeReport, status: ReportStatus) {
  const ref = changeReportRef(report, status)
  const cell = (value: string) => {
    const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
  }
  const lines = [CHANGE_COLUMNS, ...changeRows(report)].map((r) => r.map(cell).join(","))
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${ref}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
