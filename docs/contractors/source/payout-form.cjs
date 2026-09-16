/**
 * AviPrep royalty payout details: a fillable A4 PDF on the letterhead.
 * Drawn boxes carry the look; AcroForm fields sit inside them so the form
 * works on screen (Acrobat, Preview, Chrome, Edge) and prints cleanly blank.
 *
 *   node payout-form.cjs <project-root> <out.pdf>
 */
const fs = require("fs")
const path = require("path")

const root = process.argv[2]
const out = process.argv[3]
const here = __dirname
const { jsPDF, AcroFormTextField, AcroFormCheckBox } = require(path.join(root, "node_modules", "jspdf"))

const C = {
  orange: [247, 134, 1],
  orangeInk: [180, 95, 0],
  blue: [27, 95, 153],
  ink: [15, 23, 42],
  text: [51, 65, 85],
  muted: [100, 116, 139],
  line: [203, 213, 225],
  soft: [226, 232, 240],
  warm: [255, 247, 236],
  panel: [248, 250, 252],
}

// compress must stay off: jsPDF writes AcroForm fields as streams when it is on, and readers ignore them.
const doc = new jsPDF({ unit: "mm", format: "a4", compress: false })
doc.setProperties({ title: "Royalty payout details - AviPrep", author: "AviPrep", subject: "Contractor payment details" })

for (const [file, style] of [["Inter-400.ttf", "normal"], ["Inter-600.ttf", "bold"]]) {
  doc.addFileToVFS(file, fs.readFileSync(path.join(here, file)).toString("base64"))
  doc.addFont(file, "Inter", style)
}

const header = fs.readFileSync(path.join(root, "docs", "brand", "letterhead", "aviprep-letterhead-header.png"))
doc.addImage("data:image/png;base64," + header.toString("base64"), "PNG", 0, 0, 210, 40, "letterhead", "SLOW")

const M = 20
const W = 170

const text = (s, x, y, { size = 10, bold = false, color = C.text, align = "left", maxWidth } = {}) => {
  doc.setFont("Inter", bold ? "bold" : "normal")
  doc.setFontSize(size)
  doc.setTextColor(...color)
  doc.text(s, x, y, { align, maxWidth, baseline: "alphabetic" })
}

// --- Title --------------------------------------------------------------------
text("Royalty payout details", M, 57, { size: 24, bold: true, color: C.ink })
text("Fill it in on screen or print it, then email it to hello@aviprep.com.au.", M, 65, { size: 10.5, color: C.muted })

// --- Building blocks ----------------------------------------------------------
const FIELD_H = 9.5
let fieldCount = 0

function section(n, title, y) {
  doc.setFillColor(...C.orange)
  doc.circle(M + 3, y - 1.4, 3, "F")
  text(String(n), M + 3, y - 0.1, { size: 8.5, bold: true, color: [255, 255, 255], align: "center" })
  text(title, M + 8.5, y, { size: 12.5, bold: true, color: C.ink })
  doc.setDrawColor(...C.soft)
  doc.setLineWidth(0.3)
  const w = doc.getTextWidth(title)
  doc.line(M + 8.5 + w + 4, y - 1.4, M + W, y - 1.4)
}

function field({ label, name, x, y, w, h = FIELD_H, hint, optional, maxLength, comb, cells, multiline }) {
  text(label, x, y, { size: 8.5, bold: true, color: C.ink })
  if (optional) {
    const lw = doc.getTextWidth(label)
    text("optional", x + lw + 1.6, y, { size: 8, color: C.muted })
  }
  if (hint) text(hint, x + w, y, { size: 7.5, color: C.muted, align: "right" })

  const top = y + 2
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(...C.line)
  doc.setLineWidth(0.3)
  doc.roundedRect(x, top, w, h, 1.6, 1.6, "FD")

  if (cells) {
    // Comb dividers, with a heavier break between the two halves of a BSB.
    const step = w / cells
    for (let i = 1; i < cells; i++) {
      const mid = cells === 6 && i === 3
      doc.setDrawColor(...(mid ? C.muted : C.soft))
      doc.setLineWidth(mid ? 0.35 : 0.25)
      doc.line(x + step * i, top + (mid ? 1.8 : 2.6), x + step * i, top + h - (mid ? 1.8 : 2.6))
    }
  }

  const f = new AcroFormTextField()
  f.fieldName = name
  f.x = x + (cells ? 0 : 1.2)
  f.y = top + 0.6
  f.width = w - (cells ? 0 : 2.4)
  f.height = h - 1.2
  f.fontSize = 11
  f.color = "#0F172A"
  f.doNotSpellCheck = true
  if (multiline) f.multiline = true
  if (maxLength) f.maxLength = maxLength
  if (comb) {
    f.comb = true
    f.textAlign = "center"
  }
  doc.addField(f)
  fieldCount++
}

// --- 1. About you --------------------------------------------------------------
const PITCH = 16.5
const GAP = 5
const half = (W - GAP) / 2
let y = 80
section(1, "About you", y)
y += 8.5
field({ label: "Full legal name", name: "full_name", x: M, y, w: W })
y += PITCH
field({ label: "Email", name: "email", x: M, y, w: half, hint: "for your monthly statements" })
field({ label: "Mobile", name: "mobile", x: M + half + GAP, y, w: half, hint: "e.g. 0412 345 678" })
y += PITCH
field({ label: "Street address", name: "street_address", x: M, y, w: W })
y += PITCH
const suburbW = 90
const stateW = 30
field({ label: "Suburb", name: "suburb", x: M, y, w: suburbW })
field({ label: "State", name: "state", x: M + suburbW + GAP, y, w: stateW, maxLength: 3 })
field({ label: "Postcode", name: "postcode", x: M + suburbW + stateW + GAP * 2, y, w: W - suburbW - stateW - GAP * 2, maxLength: 4, comb: true, cells: 4 })
y += PITCH
field({ label: "ABN", name: "abn", x: M, y, w: half, optional: true, hint: "11 digits" })
field({ label: "Trading name", name: "trading_name", x: M + half + GAP, y, w: half, optional: true })

// --- 2. Bank account -------------------------------------------------------------
y += PITCH + 4
section(2, "Where to pay you", y)
y += 8.5
field({ label: "Account name", name: "account_name", x: M, y, w: W, hint: "exactly as it appears on your statement" })
y += PITCH
const bsbW = 54
const accW = 64
field({ label: "BSB", name: "bsb", x: M, y, w: bsbW, maxLength: 6, comb: true, cells: 6 })
field({ label: "Account number", name: "account_number", x: M + bsbW + GAP, y, w: accW, maxLength: 10 })
field({ label: "Bank", name: "bank", x: M + bsbW + accW + GAP * 2, y, w: W - bsbW - accW - GAP * 2, optional: true })

// --- 3. Sign off -------------------------------------------------------------------
y += PITCH + 4
section(3, "Sign off", y)
y += 5.5

// Confirmation checkbox, drawn to match the fields.
const boxY = y
doc.setFillColor(255, 255, 255)
doc.setDrawColor(...C.line)
doc.setLineWidth(0.3)
doc.roundedRect(M, boxY, 5.2, 5.2, 1, 1, "FD")
const cb = new AcroFormCheckBox()
cb.fieldName = "details_confirmed"
cb.x = M + 0.4
cb.y = boxY + 0.4
cb.width = 4.4
cb.height = 4.4
cb.appearanceState = "Off"
doc.addField(cb)
fieldCount++
text("These details are correct, and I’ll let AviPrep know if they change.", M + 8, boxY + 3.8, { size: 9.5, color: C.text })

y = boxY + 11
const sigW = 118
field({ label: "Signature", name: "signature", x: M, y, w: sigW, h: 13, hint: "type your name, or print and sign" })
field({ label: "Date", name: "date", x: M + sigW + GAP, y, w: W - sigW - GAP, h: 13, hint: "dd/mm/yyyy" })

// --- Privacy note -------------------------------------------------------------------
const noteY = y + 13 + 2 + 8
doc.setFillColor(...C.panel)
doc.roundedRect(M, noteY, W, 19, 2.5, 2.5, "F")
doc.setFillColor(...C.blue)
doc.roundedRect(M, noteY, 1.2, 19, 0.6, 0.6, "F")
text("Your details stay private", M + 6, noteY + 6.6, { size: 9.5, bold: true, color: C.ink })
text(
  "We only use them to pay your royalties and send your monthly statements. We don’t share them with anyone except our bank to make the payment. Full details at aviprep.com.au/privacy.",
  M + 6,
  noteY + 11.4,
  { size: 8.5, color: C.muted, maxWidth: W - 12 },
)

fs.writeFileSync(out, Buffer.from(doc.output("arraybuffer")))
console.log("wrote", out, "fields:", fieldCount)
