/**
 * The aviation symbol set, drawn to the Airservices Aeronautical Chart User
 * Guide (C-GUIDE0824 v5).
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
 *
 * Where the guide gives a symbol, it's followed. A question that shows a
 * student a VOR should show them the VOR they'll meet on a real chart.
 */

export type Paint = string

interface Common {
  fill?: Paint
  stroke?: Paint
  sw?: number
  /** SVG stroke-dasharray, for the unverified (dashed) aerodrome symbols. */
  dash?: string
}

export type Primitive =
  | ({ t: "circle"; cx: number; cy: number; r: number } & Common)
  | ({ t: "rect"; x: number; y: number; w: number; h: number; rx?: number } & Common)
  | ({ t: "polygon"; points: string } & Common)
  | ({ t: "polyline"; points: string } & Common)
  | ({ t: "path"; d: string } & Common)
  | ({ t: "line"; x1: number; y1: number; x2: number; y2: number } & Common)
  /** Several chart symbols are literally a letter: N for NOTAM, W for winch. */
  | ({ t: "text"; x: number; y: number; size: number; text: string; anchor?: "start" | "middle" | "end"; bold?: boolean } & Common)

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

export const SYMBOL_CATEGORIES = [
  "Navaids",
  "Reporting points",
  "Aerodromes",
  "Aircraft",
  "Obstacles",
  "Sports",
  "Annotation",
] as const

/* --- Building blocks --------------------------------------------------------- */

/** The points of a regular polygon inscribed in a circle, as an SVG points list. */
function polygon(sides: number, radius: number, rotation = -90, cx = 50, cy = 50) {
  return Array.from({ length: sides }, (_, i) => {
    const angle = ((rotation + (360 / sides) * i) * Math.PI) / 180
    return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`
  }).join(" ")
}

/** A ring of dots, which is how an NDB's stipple halo is drawn. */
function dotRing(count: number, radius: number, r: number): Primitive[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = ((360 / count) * i * Math.PI) / 180
    return { t: "circle" as const, cx: 50 + radius * Math.sin(angle), cy: 50 - radius * Math.cos(angle), r, fill: "ink" }
  })
}

/** Tick marks around a compass rose, or the four cardinal ticks of a certified AD. */
function ticks(count: number, inner: number, outer: number, sw = 2): Primitive[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = ((360 / count) * i * Math.PI) / 180
    return {
      t: "line" as const,
      x1: 50 + inner * Math.sin(angle),
      y1: 50 - inner * Math.cos(angle),
      x2: 50 + outer * Math.sin(angle),
      y2: 50 - outer * Math.cos(angle),
      stroke: "ink",
      sw,
    }
  })
}

/* --- The set ----------------------------------------------------------------- */

export const SYMBOLS: SymbolDef[] = [
  // --- Navaids (Table 14) ----------------------------------------------------
  {
    id: "vor",
    label: "VOR",
    category: "Navaids",
    hint: "VHF omnidirectional range",
    draw: [
      { t: "polygon", points: polygon(6, 34), fill: "none", stroke: "ink", sw: 6 },
      { t: "circle", cx: 50, cy: 50, r: 5, fill: "ink" },
    ],
  },
  {
    id: "vor-rose",
    label: "VOR + rose",
    category: "Navaids",
    hint: "VOR with its compass rose, as on visual charts",
    size: 150,
    draw: [
      { t: "polygon", points: polygon(6, 22), fill: "none", stroke: "ink", sw: 4 },
      { t: "circle", cx: 50, cy: 50, r: 3.5, fill: "ink" },
      { t: "circle", cx: 50, cy: 50, r: 44, fill: "none", stroke: "ink", sw: 1.6 },
      ...ticks(36, 39, 44, 1.4),
      ...ticks(12, 34, 44, 2.2),
    ],
  },
  {
    id: "vor-dme",
    label: "VOR/DME",
    category: "Navaids",
    hint: "VOR co-located with DME",
    draw: [
      { t: "rect", x: 15, y: 15, w: 70, h: 70, fill: "none", stroke: "ink", sw: 6 },
      { t: "polygon", points: polygon(6, 28), fill: "none", stroke: "ink", sw: 6 },
      { t: "circle", cx: 50, cy: 50, r: 5, fill: "ink" },
    ],
  },
  {
    id: "vortac",
    label: "VORTAC",
    category: "Navaids",
    hint: "VOR and TACAN together",
    draw: [
      { t: "polygon", points: polygon(6, 30), fill: "none", stroke: "ink", sw: 6 },
      { t: "circle", cx: 50, cy: 50, r: 5, fill: "ink" },
      // The three TACAN lobes, on alternate faces of the hexagon.
      { t: "polygon", points: "76.0,57.0 76.0,43.0 92.0,43.0 92.0,57.0", fill: "ink" },
      { t: "polygon", points: "30.9,69.0 43.1,76.0 35.1,89.9 22.9,82.9", fill: "ink" },
      { t: "polygon", points: "43.1,24.0 30.9,31.0 22.9,17.1 35.1,10.1", fill: "ink" },
    ],
  },
  {
    id: "dme",
    label: "DME",
    category: "Navaids",
    hint: "Distance measuring equipment",
    draw: [
      { t: "rect", x: 16, y: 16, w: 68, h: 68, fill: "none", stroke: "ink", sw: 6 },
      { t: "circle", cx: 50, cy: 50, r: 6, fill: "ink" },
    ],
  },
  {
    id: "tacan",
    label: "TACAN",
    category: "Navaids",
    hint: "UHF tactical air navigation aid (military)",
    draw: [
      // Three lobes around a small centre: the military aid on its own,
      // which is the VORTAC shape minus the VOR hexagon.
      { t: "polygon", points: "61.0,60.0 61.0,40.0 94.0,40.0 94.0,60.0", fill: "ink" },
      { t: "polygon", points: "35.8,54.5 53.2,64.5 36.7,93.1 19.3,83.1", fill: "ink" },
      { t: "polygon", points: "53.2,35.5 35.8,45.5 19.3,16.9 36.7,6.9", fill: "ink" },
      { t: "circle", cx: 50, cy: 50, r: 13, fill: "none", stroke: "ink", sw: 5 },
    ],
  },
  {
    id: "ndb",
    label: "NDB",
    category: "Navaids",
    hint: "Non-directional radio beacon",
    draw: [
      { t: "circle", cx: 50, cy: 50, r: 9, fill: "none", stroke: "ink", sw: 4 },
      { t: "circle", cx: 50, cy: 50, r: 3, fill: "ink" },
      // The stipple halo: two rings of dots, as the guide draws it.
      ...dotRing(12, 23, 2.6),
      ...dotRing(20, 35, 2.6),
    ],
  },
  {
    id: "locator",
    label: "Locator",
    category: "Navaids",
    hint: "NDB used as an ILS locator",
    draw: [
      { t: "circle", cx: 50, cy: 50, r: 9, fill: "none", stroke: "ink", sw: 4 },
      { t: "circle", cx: 50, cy: 50, r: 3, fill: "ink" },
      ...dotRing(14, 26, 2.8),
    ],
  },
  {
    id: "ils",
    label: "ILS / LOC",
    category: "Navaids",
    hint: "Instrument landing system or localiser beam",
    size: 130,
    draw: [
      { t: "circle", cx: 8, cy: 50, r: 6, fill: "none", stroke: "ink", sw: 3 },
      // The feathered beam, widening away from the antenna.
      { t: "path", d: "M16 50 L96 33 L96 67 Z", fill: "none", stroke: "ink", sw: 2.5 },
      ...Array.from({ length: 11 }, (_, i) => {
        const t = 0.12 + i * 0.08
        const x = 16 + t * 80
        const spread = t * 17
        return { t: "line" as const, x1: x, y1: 50 - spread, x2: x, y2: 50 + spread, stroke: "ink", sw: 2 }
      }),
    ],
  },
  {
    id: "broadcast-station",
    label: "Broadcast stn",
    category: "Navaids",
    hint: "Broadcast station used for navigation",
    draw: [
      { t: "circle", cx: 50, cy: 50, r: 30, fill: "none", stroke: "ink", sw: 5 },
      { t: "circle", cx: 50, cy: 50, r: 8, fill: "ink" },
    ],
  },
  {
    id: "navaid-limitation",
    label: "Limitation",
    category: "Navaids",
    hint: "Asterisk: the aid has an operating limitation (ERSA FAC)",
    size: 40,
    draw: [
      ...ticks(6, 0, 42, 9),
    ],
  },

  // --- Reporting points (Table 18, Figure 8) --------------------------------
  {
    id: "report-compulsory",
    label: "Compulsory",
    category: "Reporting points",
    hint: "Compulsory position report, all aircraft",
    size: 48,
    draw: [{ t: "polygon", points: polygon(3, 44), fill: "ink" }],
  },
  {
    id: "report-on-request",
    label: "On request",
    category: "Reporting points",
    hint: "Report for aircraft below 300 KT, others on request",
    size: 48,
    draw: [{ t: "polygon", points: polygon(3, 42), fill: "none", stroke: "ink", sw: 7 }],
  },
  {
    id: "waypoint-tactical",
    label: "Tactical wpt",
    category: "Reporting points",
    hint: "Waypoint, no report required",
    size: 36,
    draw: [{ t: "rect", x: 14, y: 14, w: 72, h: 72, fill: "ink" }],
  },
  {
    id: "airep",
    label: "AIREP",
    category: "Reporting points",
    hint: "AIREP Section 3 required from designated flights",
    size: 44,
    draw: [
      { t: "rect", x: 8, y: 8, w: 84, h: 84, fill: "none", stroke: "ink", sw: 7 },
      { t: "polygon", points: polygon(3, 28), fill: "ink" },
    ],
  },
  {
    id: "waypoint-flyby",
    label: "Fly-by wpt",
    category: "Reporting points",
    hint: "Fly-by waypoint (IAL charts)",
    size: 48,
    draw: [
      { t: "path", d: "M50 4 L62 38 L96 50 L62 62 L50 96 L38 62 L4 50 L38 38 Z", fill: "none", stroke: "ink", sw: 6 },
    ],
  },
  {
    id: "waypoint-flyover",
    label: "Fly-over wpt",
    category: "Reporting points",
    hint: "Fly-over waypoint (IAL charts)",
    size: 52,
    draw: [
      { t: "circle", cx: 50, cy: 50, r: 44, fill: "none", stroke: "ink", sw: 5 },
      { t: "path", d: "M50 10 L59 41 L90 50 L59 59 L50 90 L41 59 L10 50 L41 41 Z", fill: "none", stroke: "ink", sw: 5 },
    ],
  },
  {
    id: "iaf",
    label: "IAF",
    category: "Reporting points",
    hint: "Initial approach fix",
    size: 44,
    draw: [{ t: "polygon", points: polygon(3, 42), fill: "none", stroke: "ink", sw: 5 }],
  },
  {
    id: "faf",
    label: "FAF / FAP",
    category: "Reporting points",
    hint: "Final approach fix, or final approach point",
    size: 40,
    draw: [
      { t: "path", d: "M50 8 V92 M8 50 H92", fill: "none", stroke: "ink", sw: 7 },
      { t: "path", d: "M38 8 H62 M38 92 H62 M8 38 V62 M92 38 V62", fill: "none", stroke: "ink", sw: 7 },
    ],
  },

  // --- Aerodromes (Table 12) -------------------------------------------------
  {
    id: "aerodrome-certified",
    label: "Certified",
    category: "Aerodromes",
    hint: "Certified civil aerodrome",
    draw: [
      { t: "circle", cx: 50, cy: 50, r: 30, fill: "none", stroke: "ink", sw: 7 },
      ...ticks(4, 32, 46, 7),
    ],
  },
  {
    id: "aerodrome-ala",
    label: "ALA verified",
    category: "Aerodromes",
    hint: "Aircraft landing area, verified",
    draw: [{ t: "circle", cx: 50, cy: 50, r: 36, fill: "none", stroke: "ink", sw: 8 }],
  },
  {
    id: "aerodrome-ala-unverified",
    label: "ALA unverif.",
    category: "Aerodromes",
    hint: "Aircraft landing area, unverified: status unknown",
    draw: [{ t: "circle", cx: 50, cy: 50, r: 36, fill: "none", stroke: "ink", sw: 8, dash: "22 14" }],
  },
  {
    id: "aerodrome-military",
    label: "Military",
    category: "Aerodromes",
    draw: [
      { t: "circle", cx: 50, cy: 50, r: 38, fill: "none", stroke: "ink", sw: 7 },
      { t: "circle", cx: 50, cy: 50, r: 24, fill: "none", stroke: "ink", sw: 7 },
    ],
  },
  {
    id: "aerodrome-joint",
    label: "Joint civil/mil",
    category: "Aerodromes",
    draw: [
      { t: "circle", cx: 50, cy: 50, r: 30, fill: "none", stroke: "ink", sw: 6 },
      { t: "circle", cx: 50, cy: 50, r: 17, fill: "none", stroke: "ink", sw: 6 },
      ...ticks(4, 32, 46, 6),
    ],
  },
  {
    id: "helipad",
    label: "Helicopter site",
    category: "Aerodromes",
    draw: [
      { t: "circle", cx: 50, cy: 50, r: 36, fill: "none", stroke: "ink", sw: 6 },
      { t: "path", d: "M36 30 V70 M64 30 V70 M36 50 H64", fill: "none", stroke: "ink", sw: 7 },
    ],
  },
  {
    id: "water-aerodrome",
    label: "Water AD",
    category: "Aerodromes",
    hint: "Water aerodrome, verified",
    draw: [
      { t: "circle", cx: 50, cy: 50, r: 36, fill: "none", stroke: "ink", sw: 5 },
      // Anchor.
      { t: "circle", cx: 50, cy: 26, r: 5, fill: "none", stroke: "ink", sw: 4 },
      { t: "path", d: "M50 31 V72", fill: "none", stroke: "ink", sw: 4 },
      { t: "path", d: "M36 40 H64", fill: "none", stroke: "ink", sw: 4 },
      { t: "path", d: "M30 58 C30 72 40 76 50 76 C60 76 70 72 70 58", fill: "none", stroke: "ink", sw: 4 },
    ],
  },
  {
    id: "water-aerodrome-unverified",
    label: "Water unverif.",
    category: "Aerodromes",
    hint: "Water aerodrome, unverified",
    draw: [
      { t: "circle", cx: 50, cy: 50, r: 36, fill: "none", stroke: "ink", sw: 5, dash: "20 13" },
      { t: "circle", cx: 50, cy: 26, r: 5, fill: "none", stroke: "ink", sw: 4 },
      { t: "path", d: "M50 31 V72", fill: "none", stroke: "ink", sw: 4 },
      { t: "path", d: "M36 40 H64", fill: "none", stroke: "ink", sw: 4 },
      { t: "path", d: "M30 58 C30 72 40 76 50 76 C60 76 70 72 70 58", fill: "none", stroke: "ink", sw: 4 },
    ],
  },
  {
    id: "arp",
    label: "ARP",
    category: "Aerodromes",
    hint: "Aerodrome reference point",
    size: 40,
    draw: [
      { t: "circle", cx: 50, cy: 50, r: 30, fill: "none", stroke: "ink", sw: 6 },
      { t: "path", d: "M50 10 V90 M10 50 H90", fill: "none", stroke: "ink", sw: 6 },
    ],
  },
  {
    id: "aerodrome-beacon",
    label: "AD beacon",
    category: "Aerodromes",
    size: 44,
    draw: [{ t: "polygon", points: "50,4 61,36 95,36 68,57 78,90 50,70 22,90 32,57 5,36 39,36", fill: "none", stroke: "ink", sw: 5 }],
  },
  {
    id: "windsock",
    label: "Windsock",
    category: "Aerodromes",
    hint: "Wind direction indicator",
    size: 56,
    draw: [
      { t: "path", d: "M16 14 V92", fill: "none", stroke: "ink", sw: 5 },
      { t: "path", d: "M20 16 L92 26 L92 46 L20 44 Z", fill: "ink" },
      { t: "path", d: "M44 19 V45 M64 22 V46", fill: "none", stroke: "#FFFFFF", sw: 4 },
    ],
  },
  {
    id: "runway",
    label: "Runway",
    category: "Aerodromes",
    hint: "Sealed runway, plan view",
    size: 120,
    draw: [
      { t: "rect", x: 41, y: 4, w: 18, h: 92, fill: "ink" },
      { t: "path", d: "M50 16 V84", fill: "none", stroke: "#FFFFFF", sw: 2.5, dash: "9 7" },
    ],
  },

  // --- Aircraft: single-engine high-wing, Cessna style -----------------------
  {
    id: "aircraft-top",
    label: "Aircraft, top",
    category: "Aircraft",
    hint: "Single-engine high wing, plan view, nose up",
    size: 96,
    draw: [
      // Propeller and spinner.
      { t: "line", x1: 30, y1: 9, x2: 70, y2: 9, stroke: "ink", sw: 3 },
      { t: "circle", cx: 50, cy: 13, r: 3.5, fill: "ink" },
      // Fuselage: cowl, cabin, tapering tail cone.
      {
        t: "path",
        d: "M50 12 C54 16 56 22 56 30 L56 72 C56 80 54 88 52 95 L48 95 C46 88 44 80 44 72 L44 30 C44 22 46 16 50 12 Z",
        fill: "ink",
      },
      // Lift struts, visible beneath the wing.
      { t: "line", x1: 45, y1: 54, x2: 24, y2: 45, stroke: "ink", sw: 2.4 },
      { t: "line", x1: 55, y1: 54, x2: 76, y2: 45, stroke: "ink", sw: 2.4 },
      // Constant-chord high wing.
      { t: "rect", x: 4, y: 31, w: 92, h: 13, rx: 4, fill: "ink" },
      // Tailplane and fin.
      { t: "rect", x: 24, y: 79, w: 52, h: 10, rx: 3, fill: "ink" },
      { t: "path", d: "M50 68 L53.5 95 L46.5 95 Z", fill: "ink" },
    ],
  },
  {
    id: "aircraft-side",
    label: "Aircraft, side",
    category: "Aircraft",
    hint: "Single-engine high wing, side view, nose left",
    size: 96,
    draw: [
      // Propeller at the nose.
      { t: "line", x1: 9, y1: 26, x2: 9, y2: 78, stroke: "ink", sw: 3 },
      { t: "circle", cx: 12, cy: 52, r: 3.5, fill: "ink" },
      // Fuselage: cowl, cabin, tail cone.
      {
        t: "path",
        d: "M12 46 C12 42 16 40 22 40 L32 40 C35 33 41 31 50 31 L62 31 C71 33 80 38 88 42 L95 44 L95 50 C86 55 74 59 60 60 L26 60 C17 60 12 55 12 46 Z",
        fill: "ink",
      },
      // High wing, seen edge-on above the cabin.
      { t: "rect", x: 32, y: 27, w: 34, h: 5, rx: 2.5, fill: "ink" },
      // Lift strut.
      { t: "line", x1: 56, y1: 33, x2: 32, y2: 57, stroke: "ink", sw: 2.6 },
      // Fin and tailplane.
      { t: "path", d: "M78 40 L90 12 L96 12 L96 44 Z", fill: "ink" },
      { t: "path", d: "M86 40 L100 35 L100 40 L90 43 Z", fill: "ink" },
      // Fixed tricycle undercarriage.
      { t: "line", x1: 24, y1: 59, x2: 21, y2: 73, stroke: "ink", sw: 3 },
      { t: "circle", cx: 21, cy: 78, r: 6, fill: "ink" },
      { t: "line", x1: 46, y1: 59, x2: 42, y2: 73, stroke: "ink", sw: 3.4 },
      { t: "circle", cx: 42, cy: 78, r: 6.5, fill: "ink" },
    ],
  },
  {
    id: "aircraft-front",
    label: "Aircraft, front",
    category: "Aircraft",
    hint: "Single-engine high wing, head-on: for attitude",
    size: 96,
    draw: [
      // High wing across the top.
      { t: "rect", x: 3, y: 30, w: 94, h: 9, rx: 4, fill: "ink" },
      // Fuselage and fin.
      { t: "rect", x: 38, y: 34, w: 24, h: 28, rx: 11, fill: "ink" },
      { t: "rect", x: 46.5, y: 8, w: 7, h: 24, rx: 3, fill: "ink" },
      // Propeller, edge-on.
      { t: "rect", x: 47.5, y: 20, w: 5, h: 62, rx: 2.5, fill: "ink" },
      // Lift struts.
      { t: "line", x1: 28, y1: 39, x2: 41, y2: 58, stroke: "ink", sw: 2.6 },
      { t: "line", x1: 72, y1: 39, x2: 59, y2: 58, stroke: "ink", sw: 2.6 },
      // Undercarriage.
      { t: "line", x1: 44, y1: 60, x2: 27, y2: 74, stroke: "ink", sw: 3 },
      { t: "line", x1: 56, y1: 60, x2: 73, y2: 74, stroke: "ink", sw: 3 },
      { t: "circle", cx: 25, cy: 78, r: 6, fill: "ink" },
      { t: "circle", cx: 75, cy: 78, r: 6, fill: "ink" },
      { t: "circle", cx: 50, cy: 78, r: 5, fill: "ink" },
    ],
  },

  // --- Obstacles (Table 21) --------------------------------------------------
  {
    id: "obstacle",
    label: "Obstacle",
    category: "Obstacles",
    hint: "Single obstacle, unlit",
    size: 56,
    draw: [
      { t: "path", d: "M50 10 L74 88", fill: "none", stroke: "ink", sw: 6 },
      { t: "path", d: "M50 10 L26 88", fill: "none", stroke: "ink", sw: 6 },
      { t: "circle", cx: 26, cy: 88, r: 4, fill: "ink" },
    ],
  },
  {
    id: "obstacle-lit",
    label: "Obstacle, lit",
    category: "Obstacles",
    size: 64,
    draw: [
      { t: "path", d: "M50 30 L72 92", fill: "none", stroke: "ink", sw: 6 },
      { t: "path", d: "M50 30 L28 92", fill: "none", stroke: "ink", sw: 6 },
      { t: "circle", cx: 28, cy: 92, r: 4, fill: "ink" },
      // The light, shown as rays.
      { t: "path", d: "M50 22 V6 M36 26 L28 12 M64 26 L72 12", fill: "none", stroke: "ink", sw: 5 },
    ],
  },
  {
    id: "obstacle-group",
    label: "Group obstacle",
    category: "Obstacles",
    size: 68,
    draw: [
      { t: "path", d: "M34 18 L56 90 M34 18 L12 90", fill: "none", stroke: "ink", sw: 5 },
      { t: "path", d: "M56 18 L78 90 M56 18 L34 90", fill: "none", stroke: "ink", sw: 5 },
      { t: "path", d: "M72 30 L90 90 M72 30 L54 90", fill: "none", stroke: "ink", sw: 5 },
      { t: "circle", cx: 12, cy: 90, r: 3.5, fill: "ink" },
    ],
  },
  {
    id: "wind-turbine",
    label: "Wind turbine",
    category: "Obstacles",
    size: 60,
    draw: [
      { t: "path", d: "M50 30 V92", fill: "none", stroke: "ink", sw: 6 },
      { t: "path", d: "M50 28 V4 M50 28 L28 44 M50 28 L72 44", fill: "none", stroke: "ink", sw: 5 },
      { t: "circle", cx: 50, cy: 28, r: 4, fill: "ink" },
    ],
  },
  {
    id: "windfarm",
    label: "Windfarm",
    category: "Obstacles",
    size: 72,
    draw: [
      { t: "path", d: "M30 40 V92", fill: "none", stroke: "ink", sw: 5 },
      { t: "path", d: "M30 38 V18 M30 38 L13 51 M30 38 L47 51", fill: "none", stroke: "ink", sw: 4 },
      { t: "circle", cx: 30, cy: 38, r: 3.2, fill: "ink" },
      { t: "path", d: "M68 30 V92", fill: "none", stroke: "ink", sw: 5 },
      { t: "path", d: "M68 28 V6 M68 28 L50 42 M68 28 L86 42", fill: "none", stroke: "ink", sw: 4 },
      { t: "circle", cx: 68, cy: 28, r: 3.2, fill: "ink" },
    ],
  },

  // --- Sports (Table 20) -----------------------------------------------------
  {
    id: "glider",
    label: "Glider ops",
    category: "Sports",
    hint: "Glider operations. Launch cables may reach 3,000 FT AGL",
    size: 68,
    draw: [
      { t: "path", d: "M50 34 C52 38 53 46 53 56 L53 74 L47 74 L47 56 C47 46 48 38 50 34 Z", fill: "ink" },
      { t: "rect", x: 2, y: 40, w: 96, h: 7, rx: 3.5, fill: "ink" },
      { t: "rect", x: 33, y: 70, w: 34, h: 6, rx: 3, fill: "ink" },
    ],
  },
  {
    id: "hang-glider",
    label: "Hang glider",
    category: "Sports",
    size: 64,
    draw: [
      { t: "path", d: "M6 22 L94 22 L50 62 Z", fill: "ink" },
      { t: "text", x: 50, y: 96, size: 34, text: "H", fill: "ink" },
    ],
  },
  {
    id: "ultralight",
    label: "Ultralight",
    category: "Sports",
    size: 64,
    draw: [
      { t: "text", x: 50, y: 28, size: 30, text: "U", fill: "ink" },
      { t: "path", d: "M50 46 C52 50 53 56 53 64 L53 76 L47 76 L47 64 C47 56 48 50 50 46 Z", fill: "ink" },
      { t: "rect", x: 8, y: 52, w: 84, h: 7, rx: 3.5, fill: "ink" },
      { t: "rect", x: 34, y: 74, w: 32, h: 6, rx: 3, fill: "ink" },
    ],
  },
  {
    id: "parachute",
    label: "Parachuting",
    category: "Sports",
    size: 64,
    draw: [
      { t: "path", d: "M8 46 C8 20 92 20 92 46 Z", fill: "ink" },
      { t: "path", d: "M12 44 L50 78 M50 44 L50 78 M88 44 L50 78", fill: "none", stroke: "ink", sw: 3 },
      { t: "circle", cx: 50, cy: 84, r: 7, fill: "ink" },
    ],
  },
  {
    id: "balloon",
    label: "Balloon",
    category: "Sports",
    size: 60,
    draw: [
      { t: "path", d: "M50 4 C76 4 88 26 88 44 C88 62 70 70 50 70 C30 70 12 62 12 44 C12 26 24 4 50 4 Z", fill: "ink" },
      { t: "path", d: "M40 70 L42 84 M60 70 L58 84", fill: "none", stroke: "ink", sw: 3 },
      { t: "rect", x: 39, y: 82, w: 22, h: 14, rx: 2, fill: "ink" },
    ],
  },
  {
    id: "model-aircraft",
    label: "Model aircraft",
    category: "Sports",
    size: 60,
    draw: [
      { t: "path", d: "M6 24 L94 24 L50 60 Z", fill: "ink" },
      { t: "text", x: 50, y: 96, size: 34, text: "M", fill: "ink" },
    ],
  },
  {
    id: "model-rocket",
    label: "Model rocket",
    category: "Sports",
    size: 56,
    draw: [
      { t: "path", d: "M50 4 C60 18 64 36 64 56 L64 80 L36 80 L36 56 C36 36 40 18 50 4 Z", fill: "ink" },
      { t: "path", d: "M36 62 L20 94 L36 90 Z M64 62 L80 94 L64 90 Z", fill: "ink" },
      { t: "path", d: "M44 84 L56 84 L50 98 Z", fill: "ink" },
    ],
  },
  {
    id: "notam-symbol",
    label: "NOTAM",
    category: "Sports",
    hint: "Activity notified by NOTAM",
    size: 44,
    draw: [{ t: "text", x: 50, y: 82, size: 86, text: "N", fill: "ink" }],
  },
  {
    id: "winch-launch",
    label: "Winch launch",
    category: "Sports",
    hint: "Winch or auto-tow launched sports aviation",
    size: 44,
    draw: [{ t: "text", x: 50, y: 82, size: 80, text: "W", fill: "ink" }],
  },

  // --- Annotation ------------------------------------------------------------
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
    hint: "Wind direction and strength",
    size: 80,
    draw: [
      { t: "line", x1: 50, y1: 92, x2: 50, y2: 18, stroke: "ink", sw: 6 },
      { t: "polygon", points: "50,4 64,26 36,26", fill: "ink" },
      { t: "line", x1: 50, y1: 34, x2: 76, y2: 24, stroke: "ink", sw: 6 },
      { t: "line", x1: 50, y1: 48, x2: 76, y2: 38, stroke: "ink", sw: 6 },
    ],
  },
  {
    id: "holding-right",
    label: "Hold, right",
    category: "Annotation",
    hint: "Right-hand holding pattern",
    size: 110,
    draw: [
      {
        t: "path",
        d: "M30 30 H70 A20 20 0 0 1 70 70 H30 A20 20 0 0 1 30 30 Z",
        fill: "none",
        stroke: "ink",
        sw: 5,
      },
      { t: "polygon", points: "44,24 44,36 32,30", fill: "ink" },
    ],
  },
  {
    id: "holding-left",
    label: "Hold, left",
    category: "Annotation",
    hint: "Left-hand holding pattern",
    size: 110,
    draw: [
      {
        t: "path",
        d: "M30 30 H70 A20 20 0 0 1 70 70 H30 A20 20 0 0 1 30 30 Z",
        fill: "none",
        stroke: "ink",
        sw: 5,
      },
      { t: "polygon", points: "56,64 56,76 68,70", fill: "ink" },
    ],
  },
  {
    id: "restricted",
    label: "Restricted",
    category: "Annotation",
    hint: "Prohibited, restricted or danger area marker",
    draw: [
      { t: "circle", cx: 50, cy: 50, r: 38, fill: "none", stroke: "ink", sw: 6 },
      { t: "line", x1: 24, y1: 76, x2: 76, y2: 24, stroke: "ink", sw: 6 },
    ],
  },
  {
    id: "circle-outline",
    label: "Range ring",
    category: "Annotation",
    hint: "A distance or airspace ring",
    size: 150,
    draw: [{ t: "circle", cx: 50, cy: 50, r: 46, fill: "none", stroke: "ink", sw: 2 }],
  },
  {
    id: "spot-elevation",
    label: "Spot elevation",
    category: "Annotation",
    hint: "Ground level, not tree-top height",
    size: 26,
    draw: [{ t: "circle", cx: 50, cy: 50, r: 30, fill: "ink" }],
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
