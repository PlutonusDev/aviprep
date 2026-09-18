"use client"

import { useCallback, useRef, useState } from "react"
import { backgroundSvg, nodeSvg } from "@lib/diagrams/render"
import {
  boundsOf,
  boundsOfAll,
  snap,
  type Box,
  type DiagramNode,
  type Point,
  type Scene,
} from "@lib/diagrams/scene"
import { cn } from "@lib/utils"

/**
 * The drawing surface.
 *
 * Each node's appearance comes from the same `nodeSvg` the exporter uses - the
 * markup is injected rather than rebuilt in JSX, so what's on screen and what
 * lands in the PNG can't drift apart. React only owns the interaction: which
 * node is under the pointer, what's selected, and where a drag has got to.
 */

export type Tool = "select" | "line" | "rect" | "ellipse" | "text"

/** A drag in progress. Kept in state so the preview follows the pointer. */
type Drag =
  | { kind: "move"; from: Point; dx: number; dy: number }
  | { kind: "resize"; id: string; from: Point; box: Box; w: number; h: number }
  | { kind: "marquee"; from: Point; to: Point }
  | { kind: "draw"; from: Point; to: Point }
  | null

export interface CanvasProps {
  scene: Scene
  selected: string[]
  tool: Tool
  gridSnap: number
  /** Null while read-only; the viewer passes nothing and nothing is interactive. */
  onSelect?: (ids: string[]) => void
  onMove?: (dx: number, dy: number) => void
  onResize?: (id: string, w: number, h: number) => void
  onDraw?: (from: Point, to: Point) => void
  className?: string
}

const HANDLE = 9

export function DiagramCanvas({
  scene,
  selected,
  tool,
  gridSnap,
  onSelect,
  onMove,
  onResize,
  onDraw,
  className,
}: CanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [drag, setDrag] = useState<Drag>(null)
  const interactive = !!onSelect

  const background = backgroundSvg(scene, "c-")
  const selectedSet = new Set(selected)
  const selectedNodes = scene.nodes.filter((n) => selectedSet.has(n.id))
  const selectionBox = boundsOfAll(selectedNodes)

  /** Screen pixels to diagram units. The SVG scales, so the ratio isn't 1. */
  const toScene = useCallback((event: { clientX: number; clientY: number }): Point => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || !rect.width) return { x: 0, y: 0 }
    const scale = scene.width / rect.width
    return { x: (event.clientX - rect.left) * scale, y: (event.clientY - rect.top) * scale }
  }, [scene.width])

  function startOnNode(event: React.PointerEvent, node: DiagramNode) {
    if (!interactive || tool !== "select") return
    event.stopPropagation()
    ;(event.target as Element).setPointerCapture?.(event.pointerId)

    // Shift adds to the selection; clicking an already-selected node keeps the
    // whole group, so a multi-node drag isn't lost on mouse-down.
    const next = event.shiftKey
      ? selectedSet.has(node.id)
        ? selected.filter((id) => id !== node.id)
        : [...selected, node.id]
      : selectedSet.has(node.id)
        ? selected
        : [node.id]
    onSelect?.(next)
    if (!node.locked) setDrag({ kind: "move", from: toScene(event), dx: 0, dy: 0 })
  }

  function startOnCanvas(event: React.PointerEvent) {
    if (!interactive) return
    ;(event.currentTarget as Element).setPointerCapture?.(event.pointerId)
    const from = toScene(event)

    if (tool === "select") {
      if (!event.shiftKey) onSelect?.([])
      setDrag({ kind: "marquee", from, to: from })
      return
    }
    setDrag({ kind: "draw", from, to: from })
  }

  function startResize(event: React.PointerEvent, box: Box, id: string) {
    event.stopPropagation()
    ;(event.target as Element).setPointerCapture?.(event.pointerId)
    setDrag({ kind: "resize", id, from: toScene(event), box, w: box.w, h: box.h })
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!drag) return
    const at = toScene(event)

    if (drag.kind === "move") {
      // Snapping applies to the total offset, so a nudged group keeps its shape.
      const dx = snap(at.x - drag.from.x, gridSnap)
      const dy = snap(at.y - drag.from.y, gridSnap)
      setDrag({ ...drag, dx, dy })
    } else if (drag.kind === "resize") {
      setDrag({
        ...drag,
        w: Math.max(8, snap(at.x - drag.box.x, gridSnap)),
        h: Math.max(8, snap(at.y - drag.box.y, gridSnap)),
      })
    } else {
      setDrag({ ...drag, to: at })
    }
  }

  function onPointerUp() {
    if (!drag) return

    if (drag.kind === "move") {
      if (drag.dx || drag.dy) onMove?.(drag.dx, drag.dy)
    } else if (drag.kind === "resize") {
      onResize?.(drag.id, drag.w, drag.h)
    } else if (drag.kind === "marquee") {
      const box = normalise(drag.from, drag.to)
      // A click, not a drag: leave the selection alone.
      if (box.w > 3 || box.h > 3) {
        onSelect?.(scene.nodes.filter((n) => overlaps(boundsOf(n), box)).map((n) => n.id))
      }
    } else if (drag.kind === "draw") {
      const from = { x: snap(drag.from.x, gridSnap), y: snap(drag.from.y, gridSnap) }
      const to = { x: snap(drag.to.x, gridSnap), y: snap(drag.to.y, gridSnap) }
      onDraw?.(from, to)
    }
    setDrag(null)
  }

  // A live drag is previewed by translating the selection, so the scene itself
  // only changes once on release - one undo step per drag.
  const moving = drag?.kind === "move" ? drag : null
  const resizing = drag?.kind === "resize" ? drag : null

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      className={cn("block h-auto w-full touch-none select-none", interactive && "cursor-crosshair", className)}
      onPointerDown={startOnCanvas}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role={interactive ? "application" : "img"}
      aria-label={interactive ? "Diagram canvas" : undefined}
    >
      <defs dangerouslySetInnerHTML={{ __html: background.defs }} />
      <g dangerouslySetInnerHTML={{ __html: background.body }} />

      {scene.nodes.map((node) => {
        const isSelected = selectedSet.has(node.id)
        const shift = moving && isSelected ? `translate(${moving.dx} ${moving.dy})` : undefined
        return (
          <g
            key={node.id}
            transform={shift}
            onPointerDown={(e) => startOnNode(e, node)}
            className={cn(interactive && tool === "select" && !node.locked && "cursor-move")}
            // The body is our own escaped markup from lib/diagrams/render.
            dangerouslySetInnerHTML={{ __html: nodeSvg(node, "c-") }}
          />
        )
      })}

      {/* --- Selection, handles and previews: chrome, never exported -------- */}
      {interactive && selectionBox && (
        <Selection
          box={resizing ? { ...resizing.box, w: resizing.w, h: resizing.h } : selectionBox}
          dx={moving?.dx ?? 0}
          dy={moving?.dy ?? 0}
          single={selectedNodes.length === 1 && selectedNodes[0].kind !== "line" ? selectedNodes[0] : null}
          onResize={startResize}
          scale={scene.width / 1000}
        />
      )}

      {drag?.kind === "marquee" && (
        <rect
          {...normaliseAttrs(drag.from, drag.to)}
          fill="var(--color-primary, #F78601)"
          fillOpacity={0.08}
          stroke="var(--color-primary, #F78601)"
          strokeWidth={scene.width / 600}
          strokeDasharray="6 4"
          pointerEvents="none"
        />
      )}

      {drag?.kind === "draw" && <DrawPreview tool={tool} from={drag.from} to={drag.to} scale={scene.width / 600} />}
    </svg>
  )
}

function Selection({
  box,
  dx,
  dy,
  single,
  onResize,
  scale,
}: {
  box: Box
  dx: number
  dy: number
  single: DiagramNode | null
  onResize: (event: React.PointerEvent, box: Box, id: string) => void
  scale: number
}) {
  const pad = 6 * scale
  const stroke = Math.max(1.5, 1.6 * scale)
  const handle = HANDLE * scale

  return (
    <g transform={`translate(${dx} ${dy})`} pointerEvents="none">
      <rect
        x={box.x - pad}
        y={box.y - pad}
        width={box.w + pad * 2}
        height={box.h + pad * 2}
        fill="none"
        stroke="var(--color-primary, #F78601)"
        strokeWidth={stroke}
        strokeDasharray={`${6 * scale} ${4 * scale}`}
      />
      {/* One handle, bottom-right: resizing from a corner is enough, and more
          handles on a small symbol are harder to hit than they are useful. */}
      {single && !single.locked && (
        <rect
          x={box.x + box.w + pad - handle / 2}
          y={box.y + box.h + pad - handle / 2}
          width={handle}
          height={handle}
          rx={handle / 4}
          fill="#FFFFFF"
          stroke="var(--color-primary, #F78601)"
          strokeWidth={stroke}
          pointerEvents="all"
          className="cursor-nwse-resize"
          onPointerDown={(e) => onResize(e, box, single.id)}
        />
      )}
    </g>
  )
}

function DrawPreview({ tool, from, to, scale }: { tool: Tool; from: Point; to: Point; scale: number }) {
  const common = {
    fill: "none",
    stroke: "var(--color-primary, #F78601)",
    strokeWidth: 2 * scale,
    strokeDasharray: `${5 * scale} ${4 * scale}`,
    pointerEvents: "none" as const,
  }
  if (tool === "line") return <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} {...common} />
  if (tool === "ellipse") {
    const box = normalise(from, to)
    return <ellipse cx={box.x + box.w / 2} cy={box.y + box.h / 2} rx={box.w / 2} ry={box.h / 2} {...common} />
  }
  if (tool === "rect") return <rect {...normaliseAttrs(from, to)} {...common} />
  // Text is placed by a click, so there's nothing to drag out.
  return null
}

/* --- Geometry helpers -------------------------------------------------------- */

const normalise = (a: Point, b: Point): Box => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  w: Math.abs(b.x - a.x),
  h: Math.abs(b.y - a.y),
})

const normaliseAttrs = (a: Point, b: Point) => {
  const box = normalise(a, b)
  return { x: box.x, y: box.y, width: box.w, height: box.h }
}

/** Marquee selection takes anything it touches, not only what it encloses. */
const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
