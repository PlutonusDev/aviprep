"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Eraser, PenLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@lib/utils"

/**
 * Sign with a finger, a stylus or a mouse.
 *
 * Drawn at the device's own pixel density and exported trimmed to the ink, so a
 * small signature in the corner of the box doesn't end up as a small signature
 * in the corner of the PDF. Strokes are smoothed through their midpoints, which
 * is what stops a mouse signature looking like a seismograph.
 */
export function SignaturePad({
  onChange,
  invalid,
  className,
}: {
  onChange: (dataUrl: string | null) => void
  invalid?: boolean
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  /** The ink's bounding box, so the export can be trimmed to it. */
  const bounds = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const [hasInk, setHasInk] = useState(false)

  const setup = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = Math.min(window.devicePixelRatio || 1, 3)
    const rect = canvas.getBoundingClientRect()
    if (!rect.width) return
    canvas.width = Math.round(rect.width * ratio)
    canvas.height = Math.round(rect.height * ratio)
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = "#0F172A"
  }, [])

  useEffect(() => {
    setup()
    // A rotated phone or a resized window changes the box; the ink can't
    // survive that, so start clean rather than stretched.
    const onResize = () => {
      setup()
      bounds.current = null
      setHasInk(false)
      onChange(null)
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [setup, onChange])

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const mark = (p: { x: number; y: number }) => {
    const b = bounds.current
    bounds.current = b
      ? { x0: Math.min(b.x0, p.x), y0: Math.min(b.y0, p.y), x1: Math.max(b.x1, p.x), y1: Math.max(b.y1, p.y) }
      : { x0: p.x, y0: p.y, x1: p.x, y1: p.y }
  }

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    drawing.current = true
    const p = point(event)
    last.current = p
    mark(p)
    // A single tap should still leave a dot.
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return
    ctx.beginPath()
    ctx.arc(p.x, p.y, 1.1, 0, Math.PI * 2)
    ctx.fillStyle = "#0F172A"
    ctx.fill()
    setHasInk(true)
  }

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext("2d")
    const from = last.current
    if (!ctx || !from) return
    const p = point(event)
    const mid = { x: (from.x + p.x) / 2, y: (from.y + p.y) / 2 }
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.quadraticCurveTo(from.x, from.y, mid.x, mid.y)
    ctx.stroke()
    last.current = p
    mark(p)
  }

  const end = useCallback(() => {
    if (!drawing.current) return
    drawing.current = false
    last.current = null
    onChange(exportInk())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChange])

  /** The drawn ink alone, on transparent, with a little breathing room. */
  function exportInk(): string | null {
    const canvas = canvasRef.current
    const b = bounds.current
    if (!canvas || !b) return null
    const ratio = canvas.width / canvas.getBoundingClientRect().width
    const pad = 8
    const x = Math.max(0, (b.x0 - pad) * ratio)
    const y = Math.max(0, (b.y0 - pad) * ratio)
    const w = Math.min(canvas.width - x, (b.x1 - b.x0 + pad * 2) * ratio)
    const h = Math.min(canvas.height - y, (b.y1 - b.y0 + pad * 2) * ratio)
    if (w < 4 || h < 4) return null

    const out = document.createElement("canvas")
    out.width = Math.round(w)
    out.height = Math.round(h)
    const ctx = out.getContext("2d")
    if (!ctx) return null
    ctx.drawImage(canvas, x, y, w, h, 0, 0, out.width, out.height)
    return out.toDataURL("image/png")
  }

  function clear() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    bounds.current = null
    setHasInk(false)
    onChange(null)
  }

  return (
    <div className={className}>
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border bg-background transition-colors",
          invalid ? "border-destructive" : hasInk ? "border-border" : "border-dashed border-border",
        )}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
          aria-label="Sign here"
          // touch-none stops the page scrolling under a finger mid-stroke.
          className="block h-40 w-full cursor-crosshair touch-none"
        />

        {!hasInk && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
            <PenLine className="h-5 w-5" aria-hidden="true" />
            <p className="text-sm">Sign here, with a finger or a mouse</p>
          </div>
        )}

        {/* The ruled line signatures sit on, the way a paper form has one. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-8 bottom-7 border-b border-border" />
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">This goes on the copy you download.</p>
        <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={!hasInk} className="h-8 gap-1.5">
          <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
          Clear
        </Button>
      </div>
    </div>
  )
}
