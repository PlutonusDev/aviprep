"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { formatDistanceToNowStrict } from "date-fns"
import { toast } from "sonner"
import {
  ChevronDown,
  GraduationCap,
  HelpCircle,
  Layers,
  PenLine,
  Search,
  SquarePen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, PageHeader, PageShell, StatTile } from "@/components/hub/page-primitives"
import { ReviewThread } from "@/components/review/review-thread"
import { useStudioActivity } from "@/components/curators/presence-beacon"
import type { ReviewDetail } from "@/components/review/types"
import { cn } from "@lib/utils"

type State = "live" | "review" | "changes" | "draft" | "rejected"
type Filter = "all" | State | "edits"

interface Item {
  type: "question" | "lesson" | "course"
  id: string
  title: string
  context: string
  subjectId: string
  subjectCode: string
  state: State
  points: number | null
  pendingEdit: boolean
  feedback: string | null
  updatedAt: string
  editHref: string
  mine: boolean
}

const ICONS = { question: HelpCircle, lesson: GraduationCap, course: Layers }

const STATE = {
  live: { label: "Live", className: "bg-success/10 text-success" },
  review: { label: "In review", className: "bg-primary/10 text-primary" },
  changes: { label: "Changes asked", className: "bg-warning/15 text-warning" },
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  rejected: { label: "Declined", className: "bg-destructive/10 text-destructive" },
} as const

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "live", label: "Live" },
  { id: "review", label: "In review" },
  { id: "changes", label: "Changes asked" },
  { id: "draft", label: "Drafts" },
  { id: "edits", label: "My edits" },
  { id: "rejected", label: "Declined" },
]

const ago = (date: string) => formatDistanceToNowStrict(new Date(date), { addSuffix: true })

export function LibraryContent() {
  const [items, setItems] = useState<Item[] | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [filter, setFilter] = useState<Filter>("all")
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState<string | null>(null)

  useStudioActivity("in their library")

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/curators/library")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setItems(data.items)
      setCounts(data.counts)
    } catch {
      toast.error("Couldn't load your library.")
      setItems([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (items ?? []).filter((i) => {
      if (filter === "edits" ? !i.pendingEdit : filter !== "all" && i.state !== filter) return false
      return !q || `${i.title} ${i.context} ${i.subjectCode}`.toLowerCase().includes(q)
    })
  }, [items, filter, query])

  const needsYou = (items ?? []).filter((i) => i.state === "changes").length

  return (
    <PageShell>
      <PageHeader title="Library" description="Everything you've written, and where it's up to." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={PenLine} label="Live" value={items ? String(counts.live ?? 0) : "–"} />
        <StatTile icon={SquarePen} label="In review" value={items ? String(counts.review ?? 0) : "–"} />
        <StatTile
          icon={HelpCircle}
          label="Needs you"
          value={items ? String(needsYou) : "–"}
          detail={items && needsYou ? "changes asked" : undefined}
        />
        <StatTile icon={Layers} label="Drafts" value={items ? String(counts.draft ?? 0) : "–"} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter">
          {FILTERS.map((f) => {
            const count = counts[f.id] ?? 0
            if (f.id !== "all" && !count) return null
            const active = filter === f.id
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "border-primary bg-primary/10 font-medium text-foreground" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
                <span className="text-xs text-muted-foreground" data-tabular>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Label htmlFor="library-search" className="sr-only">
            Search your work
          </Label>
          <Input
            id="library-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="h-9 pl-9"
          />
        </div>
      </div>

      {!items ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={PenLine}
          title={items.length === 0 ? "Nothing here yet" : "No matches"}
          description={items.length === 0 ? "Questions you write show up here." : "Try another filter."}
        >
          {items.length === 0 && (
            <Button asChild className="h-10">
              <Link href="/admin/mos">Find something to write</Link>
            </Button>
          )}
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {shown.map((item) => (
            <Row key={`${item.type}:${item.id}`} item={item} open={open === `${item.type}:${item.id}`} onToggle={setOpen} />
          ))}
        </ul>
      )}
    </PageShell>
  )
}

function Row({ item, open, onToggle }: { item: Item; open: boolean; onToggle: (key: string | null) => void }) {
  const key = `${item.type}:${item.id}`
  const Icon = ICONS[item.type]
  const state = STATE[item.state]

  return (
    <li className="overflow-hidden rounded-xl border border-border bg-card shadow-e1">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium text-foreground">{item.title || "Untitled"}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {[item.subjectCode, item.context].filter(Boolean).join(" · ")}
            {!item.mine && " · your edit"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {item.pendingEdit && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Edit in review</span>
          )}
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", state.className)}>{state.label}</span>
          {item.points !== null && (
            <span className="hidden rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground sm:inline" data-tabular>
              {item.points} pt{item.points === 1 ? "" : "s"}
            </span>
          )}
          <span className="hidden text-xs text-muted-foreground xl:inline">{ago(item.updatedAt)}</span>

          <Button asChild variant="outline" size="sm" className="h-8">
            <Link href={item.editHref}>Edit</Link>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1"
            aria-expanded={open}
            onClick={() => onToggle(open ? null : key)}
          >
            History
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Admin feedback is the one thing worth showing without being asked. */}
      {item.state === "changes" && item.feedback && !open && (
        <p className="border-t border-warning/30 bg-warning/[0.07] px-4 py-2.5 text-sm text-foreground">{item.feedback}</p>
      )}

      {open && <History type={item.type} id={item.id} />}
    </li>
  )
}

/**
 * Who touched it, when, and what they said. The review record already holds
 * this, so the library reads it rather than keeping a second account of events.
 */
function History({ type, id }: { type: Item["type"]; id: string }) {
  const [detail, setDetail] = useState<ReviewDetail | null>(null)
  const [state, setState] = useState<"loading" | "ready" | "error">("loading")

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/review/${type}/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (cancelled) return
        setDetail(d.detail)
        setState("ready")
      })
      .catch(() => !cancelled && setState("error"))
    return () => {
      cancelled = true
    }
  }, [type, id])

  return (
    <div className="border-t border-border bg-muted/30 px-4 py-4">
      {state === "loading" ? (
        <Skeleton className="h-16 w-full" />
      ) : state === "error" || !detail ? (
        <p className="text-sm text-muted-foreground">Couldn&apos;t load the history.</p>
      ) : (
        <ReviewThread
          type={type}
          id={id}
          events={detail.events}
          onChange={setDetail}
          placeholder="Reply"
          emptyText="Nothing yet. Every submission, review and edit lands here."
        />
      )}
    </div>
  )
}
