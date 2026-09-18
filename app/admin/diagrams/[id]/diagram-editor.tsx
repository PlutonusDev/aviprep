"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft,
  Copy,
  Download,
  ImagePlus,
  Loader2,
  Lock,
  Minus,
  MousePointer2,
  Redo2,
  Save,
  Square,
  Circle as CircleIcon,
  Trash2,
  Type,
  Undo2,
  Unlock,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { DiagramCanvas, type Tool } from "@/components/diagrams/diagram-canvas"
import { SymbolTile } from "@/components/diagrams/symbol-tile"
import { Inspector } from "@/components/diagrams/inspector"
import { useStudioActivity } from "@/components/curators/presence-beacon"
import { downloadPng, downloadSvg, publishPng } from "@lib/diagrams/export"
import { canRedo, canUndo, commit, initHistory, redo, undo, type History } from "@lib/diagrams/history"
import {
  ACCENT,
  BLUE,
  INK,
  blankScene,
  duplicateNodes,
  moveNodes,
  nodeId,
  readScene,
  removeNodes,
  reorderNodes,
  resizeNode,
  updateNodes,
  type DiagramNode,
  type Point,
  type Scene,
} from "@lib/diagrams/scene"
import { symbolSize, symbolsByCategory } from "@lib/diagrams/symbols"
import { cn } from "@lib/utils"

const TOOLS: { id: Tool; label: string; icon: React.ComponentType<{ className?: string }>; key: string }[] = [
  { id: "select", label: "Select", icon: MousePointer2, key: "V" },
  { id: "line", label: "Line", icon: Minus, key: "L" },
  { id: "rect", label: "Rectangle", icon: Square, key: "R" },
  { id: "ellipse", label: "Ellipse", icon: CircleIcon, key: "O" },
  { id: "text", label: "Text", icon: Type, key: "T" },
]

const PALETTE = [INK, ACCENT, BLUE, "#15803D", "#B91C1C", "#64748B", "#FFFFFF"]

export function DiagramEditor({ id }: { id: string }) {
  const [title, setTitle] = useState("")
  const [history, setHistory] = useState<History | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [tool, setTool] = useState<Tool>("select")
  const [gridSnap, setGridSnap] = useState(10)
  const [colour, setColour] = useState(INK)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [dirty, setDirty] = useState(false)
  const fileInput = useRef<HTMLInputElement | null>(null)
  const [imageTarget, setImageTarget] = useState<"node" | "background">("node")

  const scene = history?.present ?? null
  useStudioActivity(title ? `diagram: ${title}` : "drawing a diagram")

  /* --- Loading and saving --------------------------------------------------- */

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/diagrams/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (cancelled) return
        setTitle(d.diagram.title)
        setHistory(initHistory(readScene(d.diagram.scene)))
      })
      .catch(() => toast.error("Couldn't open that diagram."))
    return () => {
      cancelled = true
    }
  }, [id])

  /** Every change goes through here, so undo and the dirty flag can't be missed. */
  const change = useCallback((next: Scene | ((current: Scene) => Scene), opts?: { coalesce?: boolean }) => {
    setHistory((h) => {
      if (!h) return h
      const resolved = typeof next === "function" ? next(h.present) : next
      return commit(h, resolved, opts)
    })
    setDirty(true)
  }, [])

  const save = useCallback(
    async (silent = false) => {
      if (!scene) return
      setSaving(true)
      try {
        const res = await fetch(`/api/admin/diagrams/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scene, title: title.trim() || "Untitled diagram" }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          toast.error(data.error || "Couldn't save.")
          return
        }
        setDirty(false)
        if (!silent) toast.success("Saved")
      } finally {
        setSaving(false)
      }
    },
    [id, scene, title],
  )

  // A drawing is easy to lose to a closed tab, so it saves itself while idle.
  useEffect(() => {
    if (!dirty || !scene) return
    const timer = setTimeout(() => save(true), 4000)
    return () => clearTimeout(timer)
  }, [dirty, scene, save])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  /* --- Adding things -------------------------------------------------------- */

  const centre = (): Point => ({ x: (scene?.width ?? 1200) / 2, y: (scene?.height ?? 675) / 2 })

  const add = useCallback(
    (node: DiagramNode) => {
      change((s) => ({ ...s, nodes: [...s.nodes, node] }))
      setSelected([node.id])
      setTool("select")
    },
    [change],
  )

  function addSymbol(symbol: string) {
    const at = centre()
    add({ id: nodeId("symbol"), kind: "symbol", symbol, x: at.x, y: at.y, size: symbolSize(symbol), colour, rotation: 0 })
  }

  /** What the shape tools produce once a drag finishes. */
  function draw(from: Point, to: Point) {
    if (tool === "line") {
      if (Math.hypot(to.x - from.x, to.y - from.y) < 4) return
      add({ id: nodeId("line"), kind: "line", points: [from, to], colour, width: 3, dash: "solid", arrowEnd: true, rotation: 0 })
      return
    }
    if (tool === "text") {
      add({ id: nodeId("text"), kind: "text", x: from.x, y: from.y, text: "Label", size: 28, colour, align: "middle", rotation: 0 })
      return
    }
    // Everything above returned, so only the two box shapes are left.
    const kind = tool as "rect" | "ellipse"
    const x = Math.min(from.x, to.x)
    const y = Math.min(from.y, to.y)
    const w = Math.abs(to.x - from.x)
    const h = Math.abs(to.y - from.y)
    if (w < 6 || h < 6) return
    add({ id: nodeId(kind), kind, x, y, w, h, colour, fill: "none", width: 3, dash: "solid", rotation: 0 })
  }

  async function uploadImage(file: File) {
    const form = new FormData()
    form.append("file", file)
    const res = await fetch("/api/admin/questions/image", { method: "POST", body: form })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.url) {
      toast.error(data.error || "That didn't upload.")
      return
    }
    if (imageTarget === "background") {
      change((s) => ({ ...s, background: { ...s.background, imageUrl: data.url } }))
      return
    }
    // Placed at a readable size; the author drags it to fit.
    const w = Math.min(scene?.width ?? 1200, 480)
    add({ id: nodeId("image"), kind: "image", x: 60, y: 60, w, h: w * 0.62, src: data.url, rotation: 0 })
  }

  /* --- Selection actions ---------------------------------------------------- */

  const selectedNodes = useMemo(
    () => (scene ? scene.nodes.filter((n) => selected.includes(n.id)) : []),
    [scene, selected],
  )

  const remove = useCallback(() => {
    if (!selected.length) return
    change((s) => removeNodes(s, selected))
    setSelected([])
  }, [change, selected])

  const duplicate = useCallback(() => {
    if (!selected.length) return
    setHistory((h) => {
      if (!h) return h
      const result = duplicateNodes(h.present, selected)
      setSelected(result.ids)
      return commit(h, result.scene)
    })
    setDirty(true)
  }, [selected])

  /* --- Keyboard ------------------------------------------------------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      // Never steal a key from a field someone is typing in.
      if (target?.closest("input, textarea, [contenteditable]")) return

      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault()
        setHistory((h) => (h ? (e.shiftKey ? redo(h) : undo(h)) : h))
        setDirty(true)
        return
      }
      if (meta && e.key.toLowerCase() === "y") {
        e.preventDefault()
        setHistory((h) => (h ? redo(h) : h))
        setDirty(true)
        return
      }
      if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault()
        save()
        return
      }
      if (meta && e.key.toLowerCase() === "d") {
        e.preventDefault()
        duplicate()
        return
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (!selected.length) return
        e.preventDefault()
        remove()
        return
      }
      if (e.key === "Escape") {
        setSelected([])
        setTool("select")
        return
      }
      if (e.key.startsWith("Arrow") && selected.length) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0
        change((s) => moveNodes(s, selected, dx, dy), { coalesce: true })
        return
      }
      const shortcut = TOOLS.find((t) => t.key.toLowerCase() === e.key.toLowerCase())
      if (shortcut && !meta) setTool(shortcut.id)
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selected, remove, duplicate, save, change])

  /* --- Publishing ----------------------------------------------------------- */

  async function publish() {
    if (!scene) return
    setPublishing(true)
    try {
      await save(true)
      const url = await publishPng(scene, title)
      await fetch(`/api/admin/diagrams/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pngUrl: url }),
      })
      await navigator.clipboard?.writeText(url).catch(() => {})
      toast.success("Published. The image link is on your clipboard.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The render didn't work.")
    } finally {
      setPublishing(false)
    }
  }

  if (!scene) {
    return (
      <div className="space-y-4 p-4 lg:p-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-[60vh] rounded-xl" />
      </div>
    )
  }

  const locked = selectedNodes.length > 0 && selectedNodes.every((n) => n.locked)

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
      {/* --- Toolbar ---------------------------------------------------------- */}
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-2.5 lg:px-6">
        <Button asChild variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="Back to diagrams">
          <Link href="/admin/diagrams">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>

        <Label htmlFor="diagram-title" className="sr-only">
          Diagram name
        </Label>
        <Input
          id="diagram-title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setDirty(true)
          }}
          maxLength={120}
          className="h-9 w-48 border-transparent bg-transparent px-2 font-medium shadow-none hover:border-border focus-visible:border-border sm:w-64"
        />

        <div role="radiogroup" aria-label="Tool" className="flex h-9 items-center rounded-lg border border-border bg-muted/40 p-1">
          {TOOLS.map((t) => {
            const Icon = t.icon
            const active = tool === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={active}
                title={`${t.label} (${t.key})`}
                onClick={() => setTool(t.id)}
                className={cn(
                  "flex h-full w-8 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">{t.label}</span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            aria-label="Undo"
            disabled={!canUndo(history!)}
            onClick={() => {
              setHistory((h) => (h ? undo(h) : h))
              setDirty(true)
            }}
          >
            <Undo2 className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            aria-label="Redo"
            disabled={!canRedo(history!)}
            onClick={() => {
              setHistory((h) => (h ? redo(h) : h))
              setDirty(true)
            }}
          >
            <Redo2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <span className="ml-auto flex items-center gap-2">
          <span aria-live="polite" className="hidden text-xs text-muted-foreground sm:inline">
            {saving ? "Saving…" : dirty ? "Unsaved" : "Saved"}
          </span>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => save()} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Save className="h-3.5 w-3.5" aria-hidden="true" />}
            Save
          </Button>
          <Button size="sm" className="h-9 gap-1.5" onClick={publish} disabled={publishing}>
            {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Upload className="h-3.5 w-3.5" aria-hidden="true" />}
            Publish
          </Button>
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* --- Palette -------------------------------------------------------- */}
        <aside className="w-full shrink-0 overflow-y-auto border-b border-border lg:w-56 lg:border-b-0 lg:border-r">
          <div className="space-y-4 p-3">
            {symbolsByCategory().map((group) => (
              <div key={group.category}>
                <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.category}
                </p>
                <div className="grid grid-cols-4 gap-0.5 lg:grid-cols-3">
                  {group.symbols.map((def) => (
                    <SymbolTile key={def.id} def={def} onPick={addSymbol} />
                  ))}
                </div>
              </div>
            ))}

            <div className="border-t border-border pt-3">
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadImage(file)
                  e.target.value = ""
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => {
                  setImageTarget("node")
                  fileInput.current?.click()
                }}
              >
                <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                Add an image
              </Button>
            </div>
          </div>
        </aside>

        {/* --- Canvas --------------------------------------------------------- */}
        <main className="min-w-0 flex-1 overflow-auto bg-muted/40 p-4 lg:p-8">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-xl border border-border shadow-e2">
            <DiagramCanvas
              scene={scene}
              selected={selected}
              tool={tool}
              gridSnap={gridSnap}
              onSelect={setSelected}
              onMove={(dx, dy) => change((s) => moveNodes(s, selected, dx, dy))}
              onResize={(nodeId2, w, h) => change((s) => resizeNode(s, nodeId2, w, h))}
              onDraw={draw}
            />
          </div>

          {selected.length > 0 && (
            <div className="mx-auto mt-3 flex max-w-5xl flex-wrap items-center gap-1.5">
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={duplicate}>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                Duplicate
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => change((s) => updateNodes(s, selected, { locked: !locked } as Partial<DiagramNode>))}
              >
                {locked ? <Unlock className="h-3.5 w-3.5" aria-hidden="true" /> : <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
                {locked ? "Unlock" : "Lock"}
              </Button>
              {(["front", "forward", "backward", "back"] as const).map((where) => (
                <Button
                  key={where}
                  variant="ghost"
                  size="sm"
                  className="h-8 capitalize"
                  onClick={() => change((s) => reorderNodes(s, selected, where))}
                >
                  {where}
                </Button>
              ))}
              <Button variant="ghost" size="sm" className="ml-auto h-8 gap-1.5 text-destructive" onClick={remove}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Delete
              </Button>
            </div>
          )}
        </main>

        {/* --- Inspector ------------------------------------------------------ */}
        <Inspector
          scene={scene}
          selected={selectedNodes}
          colour={colour}
          palette={PALETTE}
          gridSnap={gridSnap}
          onColour={setColour}
          onGridSnap={setGridSnap}
          onScene={(next, opts) => change(next, opts)}
          onNodes={(patch, opts) => change((s) => updateNodes(s, selected, patch), opts)}
          onPickBackgroundImage={() => {
            setImageTarget("background")
            fileInput.current?.click()
          }}
          onDownloadPng={() => downloadPng(scene, title)}
          onDownloadSvg={() => downloadSvg(scene, title)}
        />
      </div>
    </div>
  )
}
