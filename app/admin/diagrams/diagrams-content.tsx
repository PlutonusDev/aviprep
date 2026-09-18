"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatDistanceToNowStrict } from "date-fns"
import { toast } from "sonner"
import { Copy, Loader2, PenTool, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EmptyState, PageHeader, PageShell } from "@/components/hub/page-primitives"
import { PRESET_SIZES } from "@lib/diagrams/scene"
import { cn } from "@lib/utils"

interface Row {
  id: string
  title: string
  subjectId: string | null
  width: number
  height: number
  pngUrl: string | null
  publishedAt: string | null
  updatedAt: string
}

const ago = (date: string) => formatDistanceToNowStrict(new Date(date), { addSuffix: true })

export function DiagramsContent() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [size, setSize] = useState<string>("wide")
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/diagrams")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setRows(data.diagrams)
      setIsAdmin(data.role === "admin")
    } catch {
      toast.error("Couldn't load your diagrams.")
      setRows([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function create() {
    setCreating(true)
    try {
      const preset = PRESET_SIZES.find((p) => p.id === size) ?? PRESET_SIZES[0]
      const res = await fetch("/api/admin/diagrams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), width: preset.width, height: preset.height }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.id) {
        toast.error(data.error || "Couldn't start a new diagram.")
        return
      }
      router.push(`/admin/diagrams/${data.id}`)
    } finally {
      setCreating(false)
    }
  }

  async function remove(row: Row) {
    const res = await fetch(`/api/admin/diagrams/${row.id}`, { method: "DELETE" })
    if (!res.ok) return toast.error("Couldn't delete that one.")
    toast.success(`"${row.title}" deleted`)
    load()
  }

  const newButton = (
    <Button onClick={() => setOpen(true)} className="h-10 gap-2 self-start">
      <Plus className="h-4 w-4" aria-hidden="true" />
      New diagram
    </Button>
  )

  return (
    <PageShell>
      <PageHeader title="Diagrams" description="Charts and figures for questions and lessons.">
        {newButton}
      </PageHeader>

      {!rows ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={PenTool}
          title="Nothing drawn yet"
          description="Navaids, circuit patterns, cross-sections — anything a question needs a picture of."
        >
          {newButton}
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <li key={row.id} className="min-w-0">
              <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-e1 transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-e2">
                <Link
                  href={`/admin/diagrams/${row.id}`}
                  className="block aspect-[16/9] overflow-hidden border-b border-border bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  {row.pngUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={row.pngUrl} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      Not published yet
                    </span>
                  )}
                </Link>

                <div className="flex flex-1 flex-col p-4">
                  <Link href={`/admin/diagrams/${row.id}`} className="font-medium text-foreground hover:underline">
                    {row.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground" data-tabular>
                    {row.width}×{row.height} · edited {ago(row.updatedAt)}
                  </p>

                  <div className="mt-auto flex items-center gap-1 pt-3">
                    <Button asChild variant="outline" size="sm" className="h-9 flex-1">
                      <Link href={`/admin/diagrams/${row.id}`}>Open</Link>
                    </Button>
                    {row.pngUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        aria-label={`Copy the image link for ${row.title}`}
                        onClick={() => {
                          navigator.clipboard?.writeText(row.pngUrl!)
                          toast.success("Image link copied")
                        }}
                      >
                        <Copy className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive"
                        aria-label={`Delete ${row.title}`}
                        onClick={() => remove(row)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New diagram</DialogTitle>
            <DialogDescription>The canvas size can be changed later.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="diagram-name">Name</Label>
              <Input
                id="diagram-name"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && create()}
                placeholder="e.g. NDB tracking, inbound"
                maxLength={120}
                autoFocus
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Shape</Label>
              <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Canvas shape">
                {PRESET_SIZES.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    role="radio"
                    aria-checked={size === preset.id}
                    onClick={() => setSize(preset.id)}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      size === preset.id
                        ? "border-primary bg-primary/10 font-medium text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {preset.label}
                    <span className="block text-[10px] text-muted-foreground" data-tabular>
                      {preset.width}×{preset.height}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={create} disabled={creating} className="gap-1.5">
              {creating && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Start drawing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
