/**
 * Branded header art for subject and course cards.
 *
 * One SVG generator serves three consumers: the card header fallback, the admin
 * tool's live preview, and its PNG export. Keeping them on one implementation is
 * what stops the generated images drifting from the fallbacks.
 *
 * Hue is chosen by licence type from a fixed list - never generated per subject -
 * so the five families stay visually distinct and a subject never changes colour
 * because the catalogue was reordered.
 */

export type ArtPattern = "arcs" | "contours" | "grid" | "runway"

export const ART_PATTERNS: { id: ArtPattern; label: string }[] = [
  { id: "arcs", label: "Radar arcs" },
  { id: "contours", label: "Contours" },
  { id: "grid", label: "Chart grid" },
  { id: "runway", label: "Runway" },
]

/** Deep, professional grounds. Brand orange is the accent on all of them. */
export const LICENSE_PALETTES: Record<string, { from: string; to: string; label: string }> = {
  rpl: { from: "#06323A", to: "#0A5463", label: "RPL - teal" },
  ppl: { from: "#0C3320", to: "#135233", label: "PPL - green" },
  cpl: { from: "#241545", to: "#3D206B", label: "CPL - violet" },
  atpl: { from: "#2E1420", to: "#521F33", label: "ATPL - crimson" },
  irex: { from: "#2B1F0B", to: "#4E3717", label: "IREX - bronze" },
}

export const DEFAULT_PALETTE = { from: "#14181D", to: "#232A33", label: "Neutral - slate" }

const ACCENT = "#F78601"

export interface CourseArtOptions {
  /** The big text. Wraps across up to three lines and shrinks to fit. */
  title: string
  /** Small line above the title, e.g. "RPL - RBKA". */
  eyebrow?: string
  /** Used only for the export filename and the automatic pattern seed. */
  code?: string
  licenseType?: string
  pattern?: ArtPattern
  /** Overrides the licence palette when the admin tool picks a colour by hand. */
  from?: string
  to?: string
  width?: number
  height?: number
  /** Set false for the PNG export, where the wordmark is baked in. */
  showWordmark?: boolean
}

/** Stable choice so a subject looks the same everywhere without storing anything. */
export function defaultPatternFor(seed: string): ArtPattern {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return ART_PATTERNS[h % ART_PATTERNS.length].id
}

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!,
  )
}

/**
 * SVG has no text wrapping, so lines are measured here. Inter's average advance
 * sits near 0.55em for mixed-case text; the estimate only has to be close
 * enough to pick a size that does not overflow the band.
 */
const AVG_ADVANCE = 0.55

function wrapToWidth(text: string, fontSize: number, maxWidth: number): string[] {
  const maxChars = Math.max(4, Math.floor(maxWidth / (fontSize * AVG_ADVANCE)))
  const words = (text ?? "").trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ""

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (candidate.length <= maxChars) {
      line = candidate
    } else {
      if (line) lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines
}

/**
 * Largest size at which the title fits the box in BOTH directions. Checking the
 * line count alone let a three-line title run off the top of the band.
 */
function fitTitle(text: string, maxWidth: number, maxHeight: number, maxLines = 3) {
  const LINE_RATIO = 1.12
  for (const ratio of [0.30, 0.26, 0.22, 0.19, 0.16, 0.14, 0.12]) {
    const fontSize = Math.round(maxHeight * ratio)
    const lines = wrapToWidth(text, fontSize, maxWidth)
    if (lines.length <= maxLines && lines.length * fontSize * LINE_RATIO <= maxHeight) {
      return { fontSize, lines, lineHeight: Math.round(fontSize * LINE_RATIO) }
    }
  }
  // Nothing fits cleanly: take the smallest size and clip to maxLines.
  const fontSize = Math.round(maxHeight * 0.11)
  return {
    fontSize,
    lines: wrapToWidth(text, fontSize, maxWidth).slice(0, maxLines),
    lineHeight: Math.round(fontSize * LINE_RATIO),
  }
}

function patternMarkup(pattern: ArtPattern, w: number, h: number): string {
  switch (pattern) {
    case "arcs": {
      // Concentric sweeps from the lower right, like a radar return.
      const cx = w * 0.82
      const cy = h * 1.05
      return Array.from({ length: 7 }, (_, i) => {
        const r = (i + 1) * (w * 0.11)
        return `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="#fff" stroke-opacity="${(0.09 - i * 0.008).toFixed(3)}" stroke-width="1.5"/>`
      }).join("")
    }
    case "contours": {
      // Stacked topographic lines.
      return Array.from({ length: 9 }, (_, i) => {
        const y = h * 0.18 + i * (h * 0.1)
        const amp = 10 + (i % 3) * 6
        return `<path d="M0 ${y.toFixed(1)} C ${w * 0.25} ${(y - amp).toFixed(1)}, ${w * 0.55} ${(y + amp).toFixed(1)}, ${w} ${(y - amp / 2).toFixed(1)}" fill="none" stroke="#fff" stroke-opacity="${(0.14 - i * 0.008).toFixed(3)}" stroke-width="1.75"/>`
      }).join("")
    }
    case "grid": {
      const step = Math.round(w / 16)
      const v = Array.from({ length: 16 }, (_, i) => `<line x1="${i * step}" y1="0" x2="${i * step}" y2="${h}" stroke="#fff" stroke-opacity="0.05" stroke-width="1"/>`).join("")
      const rows = Math.ceil(h / step)
      const hz = Array.from({ length: rows }, (_, i) => `<line x1="0" y1="${i * step}" x2="${w}" y2="${i * step}" stroke="#fff" stroke-opacity="0.05" stroke-width="1"/>`).join("")
      return v + hz
    }
    case "runway": {
      // Angled threshold bars.
      return Array.from({ length: 8 }, (_, i) => {
        const x = w * 0.55 + i * (w * 0.06)
        return `<rect x="${x.toFixed(1)}" y="${-h * 0.2}" width="${(w * 0.022).toFixed(1)}" height="${h * 1.4}" fill="#fff" fill-opacity="${(0.07 - i * 0.006).toFixed(3)}" transform="rotate(18 ${x.toFixed(1)} ${h / 2})"/>`
      }).join("")
    }
  }
}

export function courseArtSvg(opts: CourseArtOptions): string {
  const w = opts.width ?? 960
  const h = opts.height ?? 320
  const palette =
    opts.from && opts.to
      ? { from: opts.from, to: opts.to }
      : LICENSE_PALETTES[opts.licenseType ?? ""] ?? DEFAULT_PALETTE
  const pattern = opts.pattern ?? defaultPatternFor(opts.code || opts.title)
  const showWordmark = opts.showWordmark !== false
  const eyebrow = opts.eyebrow?.trim() ?? ""

  const padX = Math.round(w * 0.06)
  const eyebrowSize = Math.round(h * 0.075)

  // The band between the eyebrow and the wordmark row is all the title gets.
  const titleTop = Math.round(h * 0.26)
  const titleBottom = h - Math.round(h * 0.16)
  const { fontSize, lines, lineHeight } = fitTitle(
    opts.title || opts.code || "",
    w - padX * 2,
    titleBottom - titleTop,
    3,
  )

  // Bottom-align the block inside that band.
  const blockBottom = titleBottom
  const firstBaseline = blockBottom - (lines.length - 1) * lineHeight

  const titleMarkup = lines
    .map(
      (line, i) =>
        `<tspan x="${padX}" y="${firstBaseline + i * lineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join("")

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${palette.from}"/>
      <stop offset="1" stop-color="${palette.to}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  ${patternMarkup(pattern, w, h)}
  <rect x="0" y="${h - 4}" width="${w}" height="4" fill="${ACCENT}"/>
  ${
    eyebrow
      ? `<text x="${padX}" y="${Math.round(h * 0.2)}" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="${eyebrowSize}" font-weight="600" letter-spacing="${(eyebrowSize * 0.16).toFixed(2)}" fill="#fff" fill-opacity="0.66">${escapeXml(eyebrow.toUpperCase())}</text>`
      : ""
  }
  <text font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="${fontSize}" font-weight="700" letter-spacing="-${(fontSize * 0.02).toFixed(2)}" fill="#fff">${titleMarkup}</text>
  ${
    showWordmark
      ? `<text x="${w - padX}" y="${h - Math.round(h * 0.07)}" text-anchor="end" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="${Math.round(h * 0.06)}" font-weight="600" letter-spacing="${(h * 0.01).toFixed(2)}" fill="#fff" fill-opacity="0.45">AVIPREP</text>`
      : ""
  }
</svg>`
}

/** Inline-able data URI, for CSS backgrounds and <img src>. */
export function courseArtDataUri(opts: CourseArtOptions): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(courseArtSvg(opts))}`
}
