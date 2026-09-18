/**
 * A scene as an SVG string.
 *
 * Pure, and deliberately not React: the same function backs the PNG export, a
 * server-side render and anything that needs a diagram as a file. The editor
 * draws its own interactive copy from the same model, so the two agree.
 */

import {
  DASH_ARRAY,
  boundsOf,
  type DiagramNode,
  type ImageNode,
  type LineNode,
  type Scene,
  type ShapeNode,
  type SymbolNode,
  type TextNode,
} from "./scene"
import { paint, symbolDef, type Primitive } from "./symbols"

const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

const attr = (name: string, value: string | number | undefined) =>
  value === undefined || value === null || value === "" ? "" : ` ${name}="${typeof value === "string" ? esc(value) : value}"`

const n = (value: number) => Math.round(value * 100) / 100

/** A symbol's primitives, drawn in its own 100x100 space. */
export function primitiveSvg(p: Primitive, ink: string): string {
  const stroke = paint(p.stroke, ink)
  // A plain line has no fill; every other primitive may.
  const fill = paint("fill" in p ? p.fill : undefined, ink)
  const common =
    attr("fill", fill) +
    attr("stroke", stroke) +
    (p.sw ? attr("stroke-width", p.sw) : "") +
    ' stroke-linecap="round" stroke-linejoin="round"'

  switch (p.t) {
    case "circle":
      return `<circle cx="${p.cx}" cy="${p.cy}" r="${p.r}"${common}/>`
    case "rect":
      return `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}"${attr("rx", p.rx)}${common}/>`
    case "polygon":
      return `<polygon points="${esc(p.points)}"${common}/>`
    case "polyline":
      return `<polyline points="${esc(p.points)}"${common}/>`
    case "path":
      return `<path d="${esc(p.d)}"${common}/>`
    case "line":
      return `<line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}"${attr("stroke", stroke)}${attr("stroke-width", p.sw ?? 2)} stroke-linecap="round"/>`
  }
}

/** Rotation is about the node's own centre, so a rotated symbol stays put. */
function transformFor(node: DiagramNode): string {
  if (!node.rotation) return ""
  const box = boundsOf(node)
  return ` transform="rotate(${n(node.rotation)} ${n(box.x + box.w / 2)} ${n(box.y + box.h / 2)})"`
}

function symbolSvg(node: SymbolNode): string {
  const def = symbolDef(node.symbol)
  if (!def) return ""
  const scale = node.size / 100
  const body = def.draw.map((p) => primitiveSvg(p, node.colour)).join("")
  const label = node.label?.trim()
    ? `<text x="${n(node.x)}" y="${n(node.y + node.size / 2 + node.size * 0.28)}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="${n(Math.max(11, node.size * 0.26))}" font-weight="600" fill="${esc(node.colour)}">${esc(node.label!.trim())}</text>`
    : ""
  return `<g${transformFor(node)}><g transform="translate(${n(node.x - node.size / 2)} ${n(node.y - node.size / 2)}) scale(${n(scale)})">${body}</g>${label}</g>`
}

function textSvg(node: TextNode): string {
  // Newlines become tspans: SVG text has no wrapping of its own.
  const lines = node.text.split("\n")
  const spans = lines
    .map((line, i) => `<tspan x="${n(node.x)}" dy="${i === 0 ? 0 : n(node.size * 1.25)}">${esc(line) || " "}</tspan>`)
    .join("")
  return `<text x="${n(node.x)}" y="${n(node.y)}" text-anchor="${node.align}" font-family="Inter, Arial, sans-serif" font-size="${n(node.size)}"${node.bold ? ' font-weight="700"' : ""} fill="${esc(node.colour)}"${transformFor(node)}>${spans}</text>`
}

function lineSvg(node: LineNode, idPrefix: string): string {
  const points = node.points.map((p) => `${n(p.x)},${n(p.y)}`).join(" ")
  const dash = DASH_ARRAY[node.dash]
  const marker = (end: "start" | "end") => `url(#${idPrefix}arrow-${end}-${node.id})`
  return `<polyline points="${points}" fill="none" stroke="${esc(node.colour)}" stroke-width="${n(node.width)}"${attr("stroke-dasharray", dash)} stroke-linecap="round" stroke-linejoin="round"${node.arrowStart ? ` marker-start="${marker("start")}"` : ""}${node.arrowEnd ? ` marker-end="${marker("end")}"` : ""}${transformFor(node)}/>`
}

function shapeSvg(node: ShapeNode): string {
  const dash = DASH_ARRAY[node.dash]
  const common = `fill="${esc(node.fill)}" stroke="${esc(node.colour)}" stroke-width="${n(node.width)}"${attr("stroke-dasharray", dash)}${transformFor(node)}`
  if (node.kind === "ellipse") {
    return `<ellipse cx="${n(node.x + node.w / 2)}" cy="${n(node.y + node.h / 2)}" rx="${n(node.w / 2)}" ry="${n(node.h / 2)}" ${common}/>`
  }
  return `<rect x="${n(node.x)}" y="${n(node.y)}" width="${n(node.w)}" height="${n(node.h)}" ${common}/>`
}

function imageSvg(node: ImageNode): string {
  return `<image href="${esc(node.src)}" x="${n(node.x)}" y="${n(node.y)}" width="${n(node.w)}" height="${n(node.h)}" preserveAspectRatio="xMidYMid meet"${transformFor(node)}/>`
}

export function nodeSvg(node: DiagramNode, idPrefix = ""): string {
  switch (node.kind) {
    case "symbol":
      return symbolSvg(node)
    case "text":
      return textSvg(node)
    case "line":
      return lineSvg(node, idPrefix)
    case "image":
      return imageSvg(node)
    default:
      return shapeSvg(node)
  }
}

/** One marker per line, because an arrowhead takes the line's own colour. */
function arrowDefs(scene: Scene, idPrefix: string): string {
  return scene.nodes
    .filter((node): node is LineNode => node.kind === "line" && (!!node.arrowStart || !!node.arrowEnd))
    .flatMap((node) => {
      const head = (end: "start" | "end", path: string) =>
        `<marker id="${idPrefix}arrow-${end}-${node.id}" viewBox="0 0 10 10" refX="${end === "end" ? 8 : 2}" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="${path}" fill="${esc(node.colour)}"/></marker>`
      return [
        node.arrowStart ? head("start", "M 10 0 L 0 5 L 10 10 z") : "",
        node.arrowEnd ? head("end", "M 0 0 L 10 5 L 0 10 z") : "",
      ]
    })
    .filter(Boolean)
    .join("")
}

export const GRID = 40

/** Grid, dots or graph paper, as a pattern behind everything else. */
export function backgroundSvg(scene: Scene, idPrefix = ""): { defs: string; body: string } {
  const { style } = scene.background
  const id = `${idPrefix}bg`
  let defs = ""

  if (style === "grid") {
    defs = `<pattern id="${id}" width="${GRID}" height="${GRID}" patternUnits="userSpaceOnUse"><path d="M ${GRID} 0 L 0 0 0 ${GRID}" fill="none" stroke="#CBD5E1" stroke-width="1"/></pattern>`
  } else if (style === "graph") {
    defs =
      `<pattern id="${id}-minor" width="${GRID / 4}" height="${GRID / 4}" patternUnits="userSpaceOnUse"><path d="M ${GRID / 4} 0 L 0 0 0 ${GRID / 4}" fill="none" stroke="#E2E8F0" stroke-width="1"/></pattern>` +
      `<pattern id="${id}" width="${GRID}" height="${GRID}" patternUnits="userSpaceOnUse"><rect width="${GRID}" height="${GRID}" fill="url(#${id}-minor)"/><path d="M ${GRID} 0 L 0 0 0 ${GRID}" fill="none" stroke="#CBD5E1" stroke-width="1.4"/></pattern>`
  } else if (style === "dots") {
    defs = `<pattern id="${id}" width="${GRID}" height="${GRID}" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.5" fill="#CBD5E1"/></pattern>`
  }

  const paper = `<rect width="${scene.width}" height="${scene.height}" fill="${esc(scene.background.colour || "#FFFFFF")}"/>`
  const pattern = defs ? `<rect width="${scene.width}" height="${scene.height}" fill="url(#${id})"/>` : ""
  const traced = scene.background.imageUrl
    ? `<image href="${esc(scene.background.imageUrl)}" x="0" y="0" width="${scene.width}" height="${scene.height}" preserveAspectRatio="xMidYMid slice" opacity="${scene.background.imageOpacity ?? 0.6}"/>`
    : ""

  return { defs, body: paper + pattern + traced }
}

/**
 * The whole diagram. `idPrefix` keeps pattern and marker ids unique when more
 * than one diagram is on a page.
 */
export function sceneToSvg(scene: Scene, { idPrefix = "", title = "" } = {}): string {
  const background = backgroundSvg(scene, idPrefix)
  const defs = background.defs + arrowDefs(scene, idPrefix)
  const body = scene.nodes.map((node) => nodeSvg(node, idPrefix)).join("")
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}">` +
    (title ? `<title>${esc(title)}</title>` : "") +
    (defs ? `<defs>${defs}</defs>` : "") +
    background.body +
    body +
    `</svg>`
  )
}
