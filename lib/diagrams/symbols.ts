/**
 * The aviation symbol set.
 *
 * Every symbol is drawn in a 100x100 box and scaled to whatever size it's
 * placed at, described as data rather than JSX so the same definition renders
 * in React, in a plain SVG string for export, and in the palette.
 *
 * Adding one is a single entry in SYMBOLS. Nothing else needs to change: the
 * palette, the renderer and the exporter all read this list.
 *
 * `fill` and `stroke` understand two tokens beyond normal CSS colours:
 *   "ink"  - the colour the author chose for that node
 *   "none" - no paint
 */

export type Paint = string

export type Primitive =
  | { t: "circle"; cx: number; cy: number; r: number; fill?: Paint; stroke?: Paint; sw?: number }
  | { t: "rect"; x: number; y: number; w: number; h: number; rx?: number; fill?: Paint; stroke?: Paint; sw?: number }
  | { t: "polygon"; points: string; fill?: Paint; stroke?: Paint; sw?: number }
  | { t: "polyline"; points: string; fill?: Paint; stroke?: Paint; sw?: number }
  | { t: "path"; d: string; fill?: Paint; stroke?: Paint; sw?: number }
  | { t: "line"; x1: number; y1: number; x2: number; y2: number; stroke?: Paint; sw?: number }

export interface SymbolDef {
  id: string
  label: string
  category: string
  /** What it's for, in the palette's tooltip. */
  hint?: string
  /** Default placed size, in diagram units. */
  size?: number
  draw: Primitive[]
}

export const SYMBOL_CATEGORIES = ["Navaids", "Points", "Aerodromes", "Aircraft", "Airspace", "Annotation"] as const

/* --- Building blocks --------------------------------------------------------- */

/** The points of a regular polygon inscribed in a circle, as an SVG points list. */
function polygon(sides: number, radius: number, rotation = -90, cx = 50, cy = 50) {
  return Array.from({ length: sides }, (_, i) => {
    const angle = ((rotation + (360 / sides) * i) * Math.PI) / 180
    return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`
  }).join(" ")
}

/** The tick marks around a VOR compass rose. */
function rose(count: number, inner: number, outer: number): Primitive[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = ((360 / count) * i * Math.PI) / 180
    return {
      t: "line" as const,
      x1: 50 + inner * Math.sin(angle),
      y1: 50 - inner * Math.cos(angle),
      x2: 50 + outer * Math.sin(angle),
      y2: 50 - outer * Math.cos(angle),
      stroke: "ink",
      sw: 2,
    }
  })
}

/* --- The set ----------------------------------------------------------------- */

export const SYMBOLS: SymbolDef[] = [
  // --- Navaids ---------------------------------------------------------------
  {
    id: "vor",
    label: "VOR",
    category: "Navaids",
    hint: "VHF omnidirectional range",
    draw: [
      { t: "polygon", points: polygon(6, 30), fill: "none", stroke: "ink", sw: 5 },
      { t: "circle", cx: 50, cy: 50, r: 4, fill: "ink" },
      ...rose(12, 32, 40),
    ],
  },
  {
    id: "vor-dme",
    label: "VOR/DME",
    category: "Navaids",
    hint: "VOR co-located with DME",
    draw: [
      { t: "rect", x: 16, y: 16, w: 68, h: 68, fill: "none", stroke: "ink", sw: 5 },
      { t: "polygon", points: polygon(6, 27), fill: "none", stroke: "ink", sw: 5 },
      { t: "circle", cx: 50, cy: 50, r: 4, fill: "ink" },
    ],
  },
  {
    id: "vortac",
    label: "VORTAC",
    category: "Navaids",
    hint: "VOR and TACAN together",
    draw: [
      { t: "polygon", points: polygon(6, 30), fill: "none", stroke: "ink", sw: 5 },
      { t: "circle", cx: 50, cy: 50, r: 4, fill: "ink" },
      // The three TACAN lobes, on alternate faces of the hexagon.
      { t: "rect", x: 44, y: 4, w: 12, h: 16, fill: "ink" },
      { t: "rect", x: 76, y: 58, w: 16, h: 12, fill: "ink" },
      { t: "rect", x: 8, y: 58, w: 16, h: 12, fill: "ink" },
    ],
  },
  {
    id: "dme",
    label: "DME",
    category: "Navaids",
    hint: "Distance measuring equipment",
    draw: [
      { t: "rect", x: 18, y: 18, w: 64, h: 64, fill: "none", stroke: "ink", sw: 5 },
      { t: "circle", cx: 50, cy: 50, r: 4, fill: "ink" },
    ],
  },
  {
    id: "ndb",
    label: "NDB",
    category: "Navaids",
    hint: "Non-directional beacon",
    draw: [
      { t: "circle", cx: 50, cy: 50, r: 5, fill: "ink" },
      { t: "circle", cx: 50, cy: 50, r: 22, fill: "none", stroke: "ink", sw: 3 },
      { t: "circle", cx: 50, cy: 50, r: 36, fill: "none", stroke: "ink", sw: 3 },
    ],
  },
  {
    id: "locator",
    label: "Locator",
    category: "Navaids",
    hint: "NDB used as an ILS locator",
    draw: [
      { t: "circle", cx: 50, cy: 50, r: 5, fill: "ink" },
      { t: "circle", cx: 50, cy: 50, r: 24, fill: "none", stroke: "ink", sw: 3 },
    ],
  },
  {
    id: "ils",
    label: "ILS",
    category: "Navaids",
    hint: "Localiser course",
    size: 96,
    draw: [
      { t: "polygon", points: "50,50 6,86 6,72", fill: "ink" },
      { t: "polygon", points: "50,50 94,86 94,72", fill: "none", stroke: "ink", sw: 4 },
      { t: "circle", cx: 50, cy: 46, r: 5, fill: "ink" },
    ],
  },

  // --- Points ----------------------------------------------------------------
  {
    id: "waypoint",
    label: "Waypoint",
    category: "Points",
    hint: "Fly-by waypoint",
    size: 48,
    draw: [{ t: "polygon", points: polygon(3, 40), fill: "none", stroke: "ink", sw: 7 }],
  },
  {
    id: "waypoint-compulsory",
    label: "Compulsory",
    category: "Points",
    hint: "Compulsory reporting point",
    size: 48,
    draw: [{ t: "polygon", points: polygon(3, 40), fill: "ink" }],
  },
  {
    id: "waypoint-flyover",
    label: "Fly-over",
    category: "Points",
    hint: "Fly-over waypoint",
    size: 52,
    draw: [
      { t: "polygon", points: polygon(3, 34), fill: "none", stroke: "ink", sw: 6 },
      { t: "circle", cx: 50, cy: 54, r: 44, fill: "none", stroke: "ink", sw: 4 },
    ],
  },
  {
    id: "intersection",
    label: "Intersection",
    category: "Points",
    size: 36,
    draw: [
      { t: "line", x1: 14, y1: 14, x2: 86, y2: 86, stroke: "ink", sw: 8 },
      { t: "line", x1: 86, y1: 14, x2: 14, y2: 86, stroke: "ink", sw: 8 },
    ],
  },
  {
    id: "dot",
    label: "Position",
    category: "Points",
    size: 24,
    draw: [{ t: "circle", cx: 50, cy: 50, r: 34, fill: "ink" }],
  },

  // --- Aerodromes ------------------------------------------------------------
  {
    id: "aerodrome",
    label: "Aerodrome",
    category: "Aerodromes",
    hint: "Aerodrome with runways",
    draw: [
      { t: "circle", cx: 50, cy: 50, r: 40, fill: "none", stroke: "ink", sw: 6 },
      { t: "line", x1: 50, y1: 12, x2: 50, y2: 88, stroke: "ink", sw: 6 },
      { t: "line", x1: 18, y1: 68, x2: 82, y2: 32, stroke: "ink", sw: 6 },
    ],
  },
  {
    id: "aerodrome-hard",
    label: "Sealed strip",
    category: "Aerodromes",
    hint: "Single sealed runway",
    draw: [
      { t: "circle", cx: 50, cy: 50, r: 40, fill: "none", stroke: "ink", sw: 6 },
      { t: "circle", cx: 50, cy: 50, r: 26, fill: "ink" },
    ],
  },
  {
    id: "helipad",
    label: "Helipad",
    category: "Aerodromes",
    draw: [
      { t: "circle", cx: 50, cy: 50, r: 40, fill: "none", stroke: "ink", sw: 6 },
      { t: "path", d: "M36 30 V70 M64 30 V70 M36 50 H64", fill: "none", stroke: "ink", sw: 8 },
    ],
  },
  {
    id: "runway",
    label: "Runway",
    category: "Aerodromes",
    hint: "Runway, plan view",
    size: 120,
    draw: [
      { t: "rect", x: 40, y: 6, w: 20, h: 88, fill: "none", stroke: "ink", sw: 4 },
      { t: "line", x1: 50, y1: 18, x2: 50, y2: 82, stroke: "ink", sw: 3 },
    ],
  },

  // --- Aircraft --------------------------------------------------------------
  {
    id: "aircraft-top",
    label: "Aircraft, top",
    category: "Aircraft",
    hint: "Plan view, nose up",
    size: 90,
    draw: [
      // Fuselage, nose to tail.
      { t: "path", d: "M50 6 C56 14 58 26 58 40 L58 62 C58 76 55 88 50 94 C45 88 42 76 42 62 L42 40 C42 26 44 14 50 6 Z", fill: "ink" },
      // Main plane and tailplane.
      { t: "path", d: "M44 36 L6 54 L6 62 L44 54 Z", fill: "ink" },
      { t: "path", d: "M56 36 L94 54 L94 62 L56 54 Z", fill: "ink" },
      { t: "path", d: "M45 82 L24 90 L24 94 L45 90 Z", fill: "ink" },
      { t: "path", d: "M55 82 L76 90 L76 94 L55 90 Z", fill: "ink" },
    ],
  },
  {
    id: "aircraft-side",
    label: "Aircraft, side",
    category: "Aircraft",
    hint: "Side view, nose left",
    size: 90,
    draw: [
      { t: "path", d: "M8 56 C18 48 34 44 54 44 L78 44 C86 44 92 47 92 52 L92 58 C92 62 88 64 82 64 L26 64 C18 64 12 61 8 56 Z", fill: "ink" },
      // Fin and tailplane.
      { t: "path", d: "M78 44 L92 20 L96 20 L94 44 Z", fill: "ink" },
      { t: "path", d: "M84 46 L99 40 L99 44 L88 50 Z", fill: "ink" },
      // Wing, seen edge-on.
      { t: "path", d: "M40 56 L58 56 L52 72 L36 72 Z", fill: "ink" },
      { t: "circle", cx: 24, cy: 70, r: 6, fill: "ink" },
      { t: "circle", cx: 62, cy: 74, r: 6, fill: "ink" },
    ],
  },
  {
    id: "aircraft-front",
    label: "Aircraft, front",
    category: "Aircraft",
    hint: "Head-on, for attitude",
    size: 90,
    draw: [
      { t: "rect", x: 4, y: 48, w: 92, h: 8, rx: 4, fill: "ink" },
      { t: "circle", cx: 50, cy: 52, r: 14, fill: "ink" },
      { t: "rect", x: 47, y: 22, w: 6, h: 26, fill: "ink" },
    ],
  },
  {
    id: "aircraft-plan-jet",
    label: "Jet, top",
    category: "Aircraft",
    hint: "Swept-wing plan view",
    size: 96,
    draw: [
      { t: "path", d: "M50 4 C55 14 57 28 57 44 L57 70 C57 84 54 92 50 96 C46 92 43 84 43 70 L43 44 C43 28 45 14 50 4 Z", fill: "ink" },
      { t: "path", d: "M44 40 L4 76 L4 84 L44 62 Z", fill: "ink" },
      { t: "path", d: "M56 40 L96 76 L96 84 L56 62 Z", fill: "ink" },
      { t: "path", d: "M45 84 L26 94 L26 97 L45 92 Z", fill: "ink" },
      { t: "path", d: "M55 84 L74 94 L74 97 L55 92 Z", fill: "ink" },
    ],
  },

  // --- Airspace --------------------------------------------------------------
  {
    id: "north-arrow",
    label: "North",
    category: "Annotation",
    hint: "True north arrow",
    size: 70,
    draw: [
      { t: "polygon", points: "50,8 62,58 50,48 38,58", fill: "ink" },
      { t: "path", d: "M38 96 V70 L62 96 V70", fill: "none", stroke: "ink", sw: 6 },
    ],
  },
  {
    id: "wind-arrow",
    label: "Wind",
    category: "Annotation",
    hint: "Wind direction",
    size: 80,
    draw: [
      { t: "line", x1: 50, y1: 92, x2: 50, y2: 18, stroke: "ink", sw: 6 },
      { t: "polygon", points: "50,4 64,26 36,26", fill: "ink" },
      { t: "line", x1: 50, y1: 34, x2: 76, y2: 24, stroke: "ink", sw: 6 },
      { t: "line", x1: 50, y1: 48, x2: 76, y2: 38, stroke: "ink", sw: 6 },
    ],
  },
  {
    id: "restricted",
    label: "Restricted",
    category: "Airspace",
    hint: "Restricted or prohibited area marker",
    draw: [
      { t: "circle", cx: 50, cy: 50, r: 38, fill: "none", stroke: "ink", sw: 6 },
      { t: "line", x1: 24, y1: 76, x2: 76, y2: 24, stroke: "ink", sw: 6 },
    ],
  },
  {
    id: "obstacle",
    label: "Obstacle",
    category: "Airspace",
    hint: "Vertical obstruction",
    size: 56,
    draw: [
      { t: "path", d: "M50 8 L70 92 L30 92 Z", fill: "none", stroke: "ink", sw: 7 },
      { t: "line", x1: 30, y1: 92, x2: 70, y2: 92, stroke: "ink", sw: 7 },
    ],
  },
  {
    id: "circle-outline",
    label: "Range ring",
    category: "Airspace",
    hint: "A distance or airspace ring",
    size: 140,
    draw: [{ t: "circle", cx: 50, cy: 50, r: 46, fill: "none", stroke: "ink", sw: 3 }],
  },
]

export const SYMBOL_BY_ID = new Map(SYMBOLS.map((s) => [s.id, s]))

export const symbolDef = (id: string) => SYMBOL_BY_ID.get(id) ?? null

export const DEFAULT_SYMBOL_SIZE = 64

export const symbolSize = (id: string) => symbolDef(id)?.size ?? DEFAULT_SYMBOL_SIZE

/** Symbols grouped for the palette, in the order the categories are declared. */
export function symbolsByCategory() {
  return SYMBOL_CATEGORIES.map((category) => ({
    category,
    symbols: SYMBOLS.filter((s) => s.category === category),
  })).filter((g) => g.symbols.length > 0)
}

/** Resolves the "ink" token against the node's own colour. */
export const paint = (value: Paint | undefined, ink: string, fallback = "none") =>
  value === undefined ? fallback : value === "ink" ? ink : value
