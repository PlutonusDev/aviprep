"use client"

import type { jsPDF as JsPDF } from "jspdf"

/** Shared look for AviPrep compliance PDFs (A4 landscape, built in the browser). */

export type RGB = [number, number, number]

export const BRAND: RGB = [247, 134, 1] // #F78601
export const INK: RGB = [23, 23, 23]
export const MUTED: RGB = [100, 100, 100]
export const HEAD: RGB = [27, 95, 153] // logo blue, readable under white text
export const RULE: RGB = [225, 225, 225]
export const GOOD: RGB = [21, 128, 61]
export const WARN: RGB = [180, 83, 9]
export const BAD: RGB = [185, 28, 28]

const GREEK: Record<string, string> = {
  α: "alpha", β: "beta", γ: "gamma", δ: "delta", Δ: "Delta", ε: "epsilon", θ: "theta", λ: "lambda",
  μ: "mu", π: "pi", ρ: "rho", σ: "sigma", τ: "tau", φ: "phi", ψ: "psi", ω: "omega", Ω: "Omega",
}

/** The built-in PDF fonts are Latin-1; map CASA's typography onto it. */
export function pdfSafe(text: string) {
  return text
    .replace(/[α-ωΑ-Ω]/g, (c) => GREEK[c] ?? c)
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/[›→]/g, ">")
    .replace(/…/g, "...")
    .replace(/•/g, "-")
    .replace(/[^\x00-\xFF\n]/g, "?")
}

export function formatDate(d: Date) {
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
}

async function loadLogo(): Promise<{ data: string; ratio: number } | null> {
  try {
    const blob = await fetch("/img/AviPrep-logo.png").then((r) => (r.ok ? r.blob() : Promise.reject()))
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
    const ratio = await new Promise<number>((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img.naturalWidth / img.naturalHeight || 4)
      img.onerror = () => resolve(4)
      img.src = data
    })
    return { data, ratio }
  } catch {
    return null
  }
}

export interface PdfKit {
  doc: JsPDF
  autoTable: (typeof import("jspdf-autotable"))["default"]
  W: number
  H: number
  M: number
  header: () => void
  sectionTitle: (text: string, y: number) => void
  paragraph: (text: string, y: number, options?: { size?: number; color?: RGB; width?: number; x?: number; bold?: boolean }) => number
  bullets: (items: string[], y: number) => number
  statBoxes: (boxes: { label: string; value: string; tone?: RGB }[], x: number, y: number, width: number, perRow: number) => number
  lastY: () => number
  tableDefaults: Record<string, unknown>
  /** Ensures `space` mm is free below y, adding a page if not. Returns the y to draw at. */
  ensure: (y: number, space: number) => number
  finish: (footer: string, filename: string) => void
}

export async function createPdf({ title, headerLabel, keywords }: { title: string; headerLabel: string; keywords: string }): Promise<PdfKit> {
  const [{ jsPDF }, { default: autoTable }, logo] = await Promise.all([import("jspdf"), import("jspdf-autotable"), loadLogo()])
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 14

  doc.setProperties({ title: pdfSafe(title), author: "AviPrep", creator: "AviPrep", keywords })

  const header = () => {
    if (logo) doc.addImage(logo.data, "PNG", M, 9, 9 * logo.ratio, 9)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(pdfSafe(headerLabel), W - M, 15, { align: "right" })
    doc.setFillColor(...BRAND)
    doc.rect(M, 21, W - 2 * M, 0.8, "F")
  }

  const sectionTitle = (text: string, y: number) => {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.setTextColor(...INK)
    doc.text(pdfSafe(text), M, y)
  }

  const paragraph = (text: string, y: number, { size = 9, color = INK, width = W - 2 * M, x = M, bold = false } = {}) => {
    doc.setFont("helvetica", bold ? "bold" : "normal")
    doc.setFontSize(size)
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(pdfSafe(text), width)
    doc.text(lines, x, y)
    return y + lines.length * size * 0.42 + 2
  }

  const bullets = (items: string[], y: number) => {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8.5)
    doc.setTextColor(...INK)
    for (const item of items) {
      const lines = doc.splitTextToSize(pdfSafe(item), W - 2 * M - 4)
      doc.text("-", M, y)
      doc.text(lines, M + 4, y)
      y += lines.length * 3.8 + 1.5
    }
    return y
  }

  const statBoxes = (boxes: { label: string; value: string; tone?: RGB }[], x: number, y: number, width: number, perRow: number) => {
    const gap = 5
    const bw = (width - gap * (perRow - 1)) / perRow
    boxes.forEach((b, i) => {
      const bx = x + (i % perRow) * (bw + gap)
      const by = y + Math.floor(i / perRow) * 25
      doc.setDrawColor(...RULE)
      doc.setLineWidth(0.3)
      doc.roundedRect(bx, by, bw, 21, 2, 2, "S")
      doc.setFont("helvetica", "bold")
      doc.setFontSize(16)
      doc.setTextColor(...(b.tone ?? INK))
      doc.text(pdfSafe(b.value), bx + 4, by + 10)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(...MUTED)
      doc.text(pdfSafe(b.label), bx + 4, by + 16.5)
    })
    return y + Math.ceil(boxes.length / perRow) * 25
  }

  const lastY = () => (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 30

  const ensure = (y: number, space: number) => {
    if (y + space <= H - 18) return y
    doc.addPage()
    header()
    return 33
  }

  const tableDefaults = {
    margin: { top: 28, left: M, right: M, bottom: 16 },
    theme: "grid" as const,
    styles: { font: "helvetica", fontSize: 8, cellPadding: 1.8, textColor: INK, lineColor: RULE, lineWidth: 0.2, valign: "top" as const, overflow: "linebreak" as const },
    headStyles: { fillColor: HEAD, textColor: [255, 255, 255] as RGB, fontStyle: "bold" as const },
    didDrawPage: header,
  }

  const finish = (footer: string, filename: string) => {
    const pages = doc.getNumberOfPages()
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(7.5)
      doc.setTextColor(...MUTED)
      doc.text(pdfSafe(footer), M, H - 8)
      doc.text(`Page ${p} of ${pages}`, W - M, H - 8, { align: "right" })
    }
    doc.save(filename)
  }

  return { doc, autoTable, W, H, M, header, sectionTitle, paragraph, bullets, statBoxes, lastY, tableDefaults, ensure, finish }
}
