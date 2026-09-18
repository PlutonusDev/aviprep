/**
 * The diagram document: what a chart is made of, and every way it can change.
 *
 * Pure. The editor, the read-only viewer and the PNG export all read the same
 * model, so a diagram looks the same wherever it's drawn.
 *
 * Coordinates are in diagram units, which are SVG user units. A diagram has a
 * fixed size and everything inside it is absolute, so exporting at any
 * resolution is a matter of scaling the viewBox.
 */

export const SCENE_VERSION = 1

export interface Point {
  x: number
  y: number
}

export type NodeKind = "symbol" | "text" | "line" | "rect" | "ellipse" | "image"

export type Dash = "solid" | "dashed" | "dotted"

interface NodeBase {
  id: string
  /** Degrees clockwise, about the node's own centre. */
  rotation: number
  locked?: boolean
}

/** One of the aviation symbols in lib/diagrams/symbols.ts, placed by its centre. */
export interface SymbolNode extends NodeBase {
  kind: "symbol"
  symbol: string
  x: number
  y: number
  size: number
  colour: string
  /** Printed under the symbol: an identifier like "WGA" or "116.1". */
  label?: string
}

export interface TextNode extends NodeBase {
  kind: "text"
  x: number
  y: number
  text: string
  size: number
  colour: string
  bold?: boolean
  align: "left" | "middle" | "end"
}

/**
 * A track, a boundary, a leader line. Points are absolute, so a line can be
 * reshaped a vertex at a time without touching an origin.
 */
export interface LineNode extends NodeBase {
  kind: "line"
  points: Point[]
  colour: string
  width: number
  dash: Dash
  arrowStart?: boolean
  arrowEnd?: boolean
}

export interface ShapeNode extends NodeBase {
  kind: "rect" | "ellipse"
  x: number
  y: number
  w: number
  h: number
  colour: string
  fill: string
  width: number
  dash: Dash
}

export interface ImageNode extends NodeBase {
  kind: "image"
  x: number
  y: number
  w: number
  h: number
  src: string
  alt?: string
}

export type DiagramNode = SymbolNode | TextNode | LineNode | ShapeNode | ImageNode

export type BackgroundStyle = "blank" | "grid" | "dots" | "graph"

export interface Background {
  style: BackgroundStyle
  colour: string
  /** A chart or photo to trace over. */
  imageUrl?: string | null
  imageOpacity?: number
}

export interface Scene {
  version: number
  width: number
  height: number
  background: Background
  nodes: DiagramNode[]
}

/* --- Defaults --------------------------------------------------------------- */

export const INK = "#0F172A"
export const ACCENT = "#F78601"
export const BLUE = "#1B5F99"

export const PRESET_SIZES = [
  { id: "wide", label: "Wide", width: 1200, height: 675 },
  { id: "standard", label: "Standard", width: 1000, height: 750 },
  { id: "square", label: "Square", width: 900, height: 900 },
  { id: "tall", label: "Tall", width: 750, height: 1000 },
] as const

export function blankScene(width = 1200, height = 675): Scene {
  return {
    version: SCENE_VERSION,
    width,
    height,
    background: { style: "grid", colour: "#FFFFFF", imageUrl: null, imageOpacity: 0.6 },
    nodes: [],
  }
}

/** Ids only have to be unique inside one diagram, and readable in a JSON dump. */
let counter = 0
export function nodeId(kind: NodeKind) {
  counter += 1
  return `${kind}-${Date.now().toString(36)}-${counter.toString(36)}`
}

/* --- Geometry --------------------------------------------------------------- */

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/**
 * The box a node occupies, before rotation. Symbols and text are placed by
 * their centre, everything else by its top-left, so selection handles need this
 * to agree with what's drawn.
 */
export function boundsOf(node: DiagramNode): Box {
  switch (node.kind) {
    case "symbol":
      return { x: node.x - node.size / 2, y: node.y - node.size / 2, w: node.size, h: node.size }
    case "text": {
      // Text has no measurable box without a DOM, so this is an estimate from
      // the glyph count. Good enough to select and drag by.
      const w = Math.max(24, node.text.length * node.size * 0.55)
      const h = node.size * 1.25
      const x = node.align === "middle" ? node.x - w / 2 : node.align === "end" ? node.x - w : node.x
      return { x, y: node.y - h * 0.8, w, h }
    }
    case "line": {
      const xs = node.points.map((p) => p.x)
      const ys = node.points.map((p) => p.y)
      const x = Math.min(...xs)
      const y = Math.min(...ys)
      return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
    }
    default:
      return { x: node.x, y: node.y, w: node.w, h: node.h }
  }
}

/** The box around several nodes, or null when nothing is selected. */
export function boundsOfAll(nodes: DiagramNode[]): Box | null {
  if (!nodes.length) return null
  const boxes = nodes.map(boundsOf)
  const x = Math.min(...boxes.map((b) => b.x))
  const y = Math.min(...boxes.map((b) => b.y))
  const right = Math.max(...boxes.map((b) => b.x + b.w))
  const bottom = Math.max(...boxes.map((b) => b.y + b.h))
  return { x, y, w: right - x, h: bottom - y }
}

export const centreOf = (box: Box): Point => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 })

/* --- Changing the scene ------------------------------------------------------ */

/** Every operation returns a new scene, so undo is a stack of snapshots. */
export function addNode(scene: Scene, node: DiagramNode): Scene {
  return { ...scene, nodes: [...scene.nodes, node] }
}

export function updateNode(scene: Scene, id: string, patch: Partial<DiagramNode>): Scene {
  return {
    ...scene,
    nodes: scene.nodes.map((n) => (n.id === id ? ({ ...n, ...patch } as DiagramNode) : n)),
  }
}

export function updateNodes(scene: Scene, ids: string[], patch: Partial<DiagramNode>): Scene {
  const set = new Set(ids)
  return {
    ...scene,
    nodes: scene.nodes.map((n) => (set.has(n.id) ? ({ ...n, ...patch } as DiagramNode) : n)),
  }
}

export function removeNodes(scene: Scene, ids: string[]): Scene {
  const set = new Set(ids)
  return { ...scene, nodes: scene.nodes.filter((n) => !set.has(n.id) || n.locked) }
}

/** Drags a selection. A line moves every vertex; everything else moves its origin. */
export function moveNodes(scene: Scene, ids: string[], dx: number, dy: number): Scene {
  const set = new Set(ids)
  return {
    ...scene,
    nodes: scene.nodes.map((n) => {
      if (!set.has(n.id) || n.locked) return n
      if (n.kind === "line") {
        return { ...n, points: n.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) }
      }
      return { ...n, x: n.x + dx, y: n.y + dy }
    }),
  }
}

export type Reorder = "front" | "forward" | "backward" | "back"

/** Paint order is array order: the last node is on top. */
export function reorderNodes(scene: Scene, ids: string[], where: Reorder): Scene {
  const set = new Set(ids)
  const picked = scene.nodes.filter((n) => set.has(n.id))
  const rest = scene.nodes.filter((n) => !set.has(n.id))
  if (!picked.length) return scene

  if (where === "front") return { ...scene, nodes: [...rest, ...picked] }
  if (where === "back") return { ...scene, nodes: [...picked, ...rest] }

  // One step at a time, keeping the selection's own order.
  const nodes = [...scene.nodes]
  const indices = nodes.map((n, i) => (set.has(n.id) ? i : -1)).filter((i) => i >= 0)
  const step = where === "forward" ? 1 : -1
  const order = where === "forward" ? [...indices].reverse() : indices
  for (const i of order) {
    const to = i + step
    if (to < 0 || to >= nodes.length || set.has(nodes[to].id)) continue
    ;[nodes[i], nodes[to]] = [nodes[to], nodes[i]]
  }
  return { ...scene, nodes }
}

/** Copies a selection, offset so the copy is visible on top of the original. */
export function duplicateNodes(scene: Scene, ids: string[], offset = 24): { scene: Scene; ids: string[] } {
  const set = new Set(ids)
  const copies = scene.nodes
    .filter((n) => set.has(n.id))
    .map((n) => {
      const copy = { ...n, id: nodeId(n.kind) } as DiagramNode
      if (copy.kind === "line") copy.points = copy.points.map((p) => ({ x: p.x + offset, y: p.y + offset }))
      else {
        copy.x += offset
        copy.y += offset
      }
      return copy
    })
  return { scene: { ...scene, nodes: [...scene.nodes, ...copies] }, ids: copies.map((n) => n.id) }
}

/** Resizes a box-like node from its bottom-right handle. Lines aren't resized. */
export function resizeNode(scene: Scene, id: string, w: number, h: number): Scene {
  const node = scene.nodes.find((n) => n.id === id)
  if (!node || node.locked) return scene
  if (node.kind === "symbol") return updateNode(scene, id, { size: Math.max(8, Math.round(w)) })
  if (node.kind === "text") return updateNode(scene, id, { size: Math.max(8, Math.round(h / 1.25)) })
  if (node.kind === "line") return scene
  return updateNode(scene, id, { w: Math.max(8, Math.round(w)), h: Math.max(8, Math.round(h)) })
}

export const snap = (value: number, grid: number) => (grid > 0 ? Math.round(value / grid) * grid : value)

/* --- Reading one back -------------------------------------------------------- */

const isPoint = (v: unknown): v is Point =>
  !!v && typeof v === "object" && Number.isFinite((v as Point).x) && Number.isFinite((v as Point).y)

const NODE_KINDS: NodeKind[] = ["symbol", "text", "line", "rect", "ellipse", "image"]

/**
 * A scene from the database or an import, made safe to render.
 *
 * Anything unrecognised is dropped rather than rejected: a diagram saved by a
 * newer build should still open in an older one, minus what it can't draw.
 */
export function readScene(input: unknown): Scene {
  const raw = (input ?? {}) as Partial<Scene>
  const width = Number.isFinite(raw.width) ? Math.min(4000, Math.max(200, Number(raw.width))) : 1200
  const height = Number.isFinite(raw.height) ? Math.min(4000, Math.max(200, Number(raw.height))) : 675
  const bg = (raw.background ?? {}) as Partial<Background>

  const nodes = Array.isArray(raw.nodes)
    ? (raw.nodes.filter((n: unknown) => {
        const node = n as DiagramNode
        if (!node || typeof node.id !== "string" || !NODE_KINDS.includes(node.kind)) return false
        if (node.kind === "line") return Array.isArray(node.points) && node.points.length >= 2 && node.points.every(isPoint)
        return Number.isFinite((node as SymbolNode).x) && Number.isFinite((node as SymbolNode).y)
      }) as DiagramNode[])
    : []

  return {
    version: SCENE_VERSION,
    width,
    height,
    background: {
      style: (["blank", "grid", "dots", "graph"] as BackgroundStyle[]).includes(bg.style as BackgroundStyle)
        ? (bg.style as BackgroundStyle)
        : "blank",
      colour: typeof bg.colour === "string" ? bg.colour : "#FFFFFF",
      imageUrl: typeof bg.imageUrl === "string" ? bg.imageUrl : null,
      imageOpacity: Number.isFinite(bg.imageOpacity) ? Number(bg.imageOpacity) : 0.6,
    },
    nodes,
  }
}

export const DASH_ARRAY: Record<Dash, string | undefined> = {
  solid: undefined,
  dashed: "10 8",
  dotted: "2 7",
}
