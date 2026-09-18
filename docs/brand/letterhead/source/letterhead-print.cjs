/**
 * AviPrep letterhead: press-ready A4, CMYK, vector.
 *
 * Same artwork as the on-screen header (see the letterhead build), redrawn as
 * vectors in CMYK so nothing is rasterised or converted at the printer:
 * - Trim: A4, 210 x 297 mm.
 * - Bleed: 3 mm on every side. Everything that touches an edge runs into it.
 * - Crop marks in the slug, in registration colour, outside the bleed.
 * - TrimBox and BleedBox set, so imposition software places it correctly.
 * - Logo drawn from public/img/bimi-logo.svg; text in Inter, embedded.
 *
 *   node docs/brand/letterhead/source/letterhead-print.cjs <out.pdf> [--no-marks]
 *
 * --no-marks writes a 216 x 303 mm page (A4 plus bleed) with no slug, which
 * some online printers ask for instead.
 */
const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "../../../..")
const { jsPDF } = require(path.join(ROOT, "node_modules", "jspdf"))

const out = process.argv[2]
const marks = !process.argv.includes("--no-marks")
if (!out) throw new Error("Usage: node letterhead-print.cjs <out.pdf> [--no-marks]")

/* --- Colour -------------------------------------------------------------------- */

// CMYK builds for the brand colours, 0-1. Small text is kept to one or two inks
// so it stays sharp even if plates register slightly off.
const CMYK = {
  orange: [0, 0.55, 1, 0], //      #F78601
  blue: [0.9, 0.58, 0.1, 0], //     #1B5F99
  ink: [0, 0, 0, 1], //             #0F172A text, as 100K
  muted: [0.2, 0, 0, 0.55], //      #64748B text
  rule: [0.1, 0, 0, 0.18], //       #CBD5E1 hairline
  registration: [1, 1, 1, 1], //    crop marks: print on every plate
}

/* --- Page geometry (mm) ----------------------------------------------------------- */

const TRIM_W = 210
const TRIM_H = 297
const BLEED = 3
const SLUG = marks ? 12 : 0 // room for crop marks beyond the bleed
const O = BLEED + SLUG // trim origin on the sheet
const PAGE_W = TRIM_W + O * 2
const PAGE_H = TRIM_H + O * 2

const doc = new jsPDF({ unit: "mm", format: [PAGE_W, PAGE_H], orientation: "portrait", compress: true })
doc.setProperties({ title: "AviPrep letterhead (print, CMYK)", author: "AviPrep", creator: "AviPrep" })

// Artwork coordinates are in trim space: (0, 0) is the top-left of the A4 sheet.
const X = (v) => O + v
const Y = (v) => O + v

const fill = (c) => doc.setFillColor(c[0], c[1], c[2], c[3])
const stroke = (c) => doc.setDrawColor(c[0], c[1], c[2], c[3])
const textColour = (c) => doc.setTextColor(c[0], c[1], c[2], c[3])

/** A rectangle in trim space; anything reaching an edge is pushed into the bleed. */
function rect(x0, y0, x1, y1, colour) {
  const bleedOut = (v, edge, max) => (v <= 0 ? -BLEED : v >= max ? max + BLEED : v)
  const ax = bleedOut(x0, 0, TRIM_W)
  const bx = bleedOut(x1, 0, TRIM_W)
  const ay = bleedOut(y0, 0, TRIM_H)
  const by = bleedOut(y1, 0, TRIM_H)
  fill(colour)
  doc.rect(X(ax), Y(ay), bx - ax, by - ay, "F")
}

/* --- Fonts ------------------------------------------------------------------------- */

for (const [file, style] of [["Inter-400.ttf", "normal"], ["Inter-600.ttf", "bold"]]) {
  const data = fs.readFileSync(path.join(ROOT, "docs", "contractors", "source", file)).toString("base64")
  doc.addFileToVFS(file, data)
  doc.addFont(file, "Inter", style)
}

/* --- Artwork (matches the on-screen header) ---------------------------------------- */

const MARGIN = 20
const RIGHT = TRIM_W - MARGIN
const LEG_END = MARGIN + 30

// Top edge: navy strip with a short orange lead, bleeding off the top and sides.
rect(0, 0, TRIM_W, 2.2, CMYK.blue)
rect(0, 0, LEG_END, 2.2, CMYK.orange)

// Logo from the SVG: two even-odd filled polygons.
const svg = fs.readFileSync(path.join(ROOT, "public", "img", "bimi-logo.svg"), "utf8")
const shapes = [...svg.matchAll(/<path[^>]*fill="([^"]+)"[^>]*\sd="([^"]+)"/g)].map(([, paint, d]) => ({
  colour: paint.startsWith("url(") ? CMYK.orange : CMYK.blue,
  subpaths: d
    .split("Z")
    .map((s) => [...s.matchAll(/[ML]\s*([\d.-]+)[\s,]+([\d.-]+)/g)].map((m) => [Number(m[1]), Number(m[2])]))
    .filter((pts) => pts.length > 2),
}))
const allPoints = shapes.flatMap((s) => s.subpaths.flat())
const minX = Math.min(...allPoints.map((p) => p[0]))
const maxX = Math.max(...allPoints.map((p) => p[0]))
const minY = Math.min(...allPoints.map((p) => p[1]))
const maxY = Math.max(...allPoints.map((p) => p[1]))
const LOGO_H = 17
const scale = LOGO_H / (maxY - minY)
const logoX = MARGIN
const logoY = 10.5

for (const shape of shapes) {
  fill(shape.colour)
  for (const pts of shape.subpaths) {
    pts.forEach(([px, py], i) => {
      const x = X(logoX + (px - minX) * scale)
      const y = Y(logoY + (py - minY) * scale)
      if (i === 0) doc.moveTo(x, y)
      else doc.lineTo(x, y)
    })
    doc.close()
  }
  doc.fillEvenOdd()
}

// Contact block, right-aligned at the margin.
doc.setFont("Inter", "bold")
doc.setFontSize(9.5)
textColour(CMYK.ink)
doc.text("aviprep.com.au", X(RIGHT), Y(17.1), { align: "right", baseline: "alphabetic" })
doc.setFont("Inter", "normal")
doc.setFontSize(8.5)
textColour(CMYK.muted)
doc.text("hello@aviprep.com.au", X(RIGHT), Y(21.9), { align: "right", baseline: "alphabetic" })
doc.text("ABN 80 167 432 520", X(RIGHT), Y(26.3), { align: "right", baseline: "alphabetic" })

// Flight track: orange departure leg in off the left edge, hairline route out
// off the right edge, waypoint ring at the right margin.
const TRACK_Y = 33.5
rect(0, TRACK_Y - 0.55, LEG_END - 0.55, TRACK_Y + 0.55, CMYK.orange)
fill(CMYK.orange)
doc.circle(X(LEG_END - 0.55), Y(TRACK_Y), 0.55, "F")

const RING_R = 1.1
const RING_X = RIGHT - RING_R
rect(LEG_END + 2.2, TRACK_Y - 0.13, RING_X - RING_R - 1.2, TRACK_Y + 0.13, CMYK.rule)
rect(RING_X + RING_R + 1.2, TRACK_Y - 0.13, TRIM_W, TRACK_Y + 0.13, CMYK.rule)

stroke(CMYK.blue)
doc.setLineWidth(0.35)
// Same outer diameter as the screen version, whose ring is drawn inside its box.
doc.circle(X(RING_X), Y(TRACK_Y), RING_R - 0.175, "S")

/* --- Crop marks ---------------------------------------------------------------------- */

if (marks) {
  const GAP = BLEED + 2 // marks start clear of the bleed
  const LEN = 6
  stroke(CMYK.registration)
  doc.setLineWidth(0.25 * 0.3528) // 0.25 pt
  const corners = [
    [0, 0, -1, -1],
    [TRIM_W, 0, 1, -1],
    [0, TRIM_H, -1, 1],
    [TRIM_W, TRIM_H, 1, 1],
  ]
  for (const [cx, cy, dx, dy] of corners) {
    // Horizontal mark along the top/bottom trim line, vertical along the side.
    doc.line(X(cx + dx * GAP), Y(cy), X(cx + dx * (GAP + LEN)), Y(cy))
    doc.line(X(cx), Y(cy + dy * GAP), X(cx), Y(cy + dy * (GAP + LEN)))
  }
}

/* --- Page boxes ------------------------------------------------------------------------ */

// PDF boxes are in points from the bottom-left of the sheet.
const pt = (mm) => (mm * 72) / 25.4
const box = (x0, y0, x1, y1) => ({ bottomLeftX: pt(x0), bottomLeftY: pt(PAGE_H - y1), topRightX: pt(x1), topRightY: pt(PAGE_H - y0) })
const page = doc.internal.getCurrentPageInfo().pageContext
page.trimBox = box(O, O, O + TRIM_W, O + TRIM_H)
page.bleedBox = box(O - BLEED, O - BLEED, O + TRIM_W + BLEED, O + TRIM_H + BLEED)

fs.writeFileSync(out, Buffer.from(doc.output("arraybuffer")))
console.log("wrote", out, `${PAGE_W} x ${PAGE_H} mm`, marks ? "with crop marks" : "no marks")
