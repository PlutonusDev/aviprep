"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { formatDistanceToNowStrict } from "date-fns"
import { toast } from "sonner"
import { AlertTriangle, CheckCircle2, ClipboardCheck, MessageCircle, RotateCw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ReviewDetailPane, TYPE_META } from "@/components/review/review-detail"
import { PersonChip } from "@/components/review/review-thread"
import type { ContentType, QueueItem, ReviewAction, ReviewDetail, ReviewKind } from "@/components/review/types"
import { cn } from "@lib/utils"

type KindFilter = "all" | ReviewKind
type TypeFilter = "all" | ContentType

const DONE_MESSAGE: Record<Exclude<ReviewAction, "comment">, string> = {
  approve: "Approved",
  "request-changes": "Sent back for changes",
  reject: "Rejected",
}

function waiting(date: string | null) {
  return date ? formatDistanceToNowStrict(new Date(date)) : ""
}

function QueueRow({ item, active, onSelect }: { item: QueueItem; active: boolean; onSelect: () => void }) {
  const meta = TYPE_META[item.type]
  const Icon = meta.icon
  const days = item.submittedAt ? (Date.now() - new Date(item.submittedAt).getTime()) / 86_400_000 : 0
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "true" : undefined}
        className={cn(
          "relative flex w-full gap-3 px-4 py-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          active ? "bg-primary/5" : "hover:bg-muted/50",
        )}
      >
        {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" />}
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 space-y-1.5">
          <span className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
            <span className={cn("rounded px-1.5 py-px", item.kind === "edit" ? "bg-primary/10 text-foreground" : "bg-muted text-muted-foreground")}>
              {item.kind === "edit" ? "Edit" : "New"} {meta.label.toLowerCase()}
            </span>
            {item.resubmitted && <span className="rounded bg-warning/15 px-1.5 py-px text-foreground">Resubmitted</span>}
            {item.missingMos && <span className="rounded bg-warning/15 px-1.5 py-px text-foreground">No MOS link</span>}
          </span>
          <span className="line-clamp-2 block text-sm font-medium leading-snug text-foreground">{item.title}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {item.subjectName}
            {item.context ? ` · ${item.context}` : ""}
          </span>
          <span className="flex items-center justify-between gap-2 pt-0.5">
            <PersonChip person={item.submittedBy ?? item.author} />
            <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              {item.comments > 0 && (
                <span className="flex items-center gap-0.5" aria-label={`${item.comments} comments`}>
                  <MessageCircle className="h-3 w-3" aria-hidden="true" />
                  {item.comments}
                </span>
              )}
              <span className={cn(days >= 3 && "font-medium text-warning")}>{waiting(item.submittedAt)}</span>
            </span>
          </span>
        </span>
      </button>
    </li>
  )
}

function Segmented<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { id: T; label: string; count?: number }[] }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg border border-border bg-muted/40 p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === o.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="tabular-nums text-muted-foreground">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function ReviewWorkspace() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [items, setItems] = useState<QueueItem[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [detail, setDetail] = useState<ReviewDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [query, setQuery] = useState("")
  const [kind, setKind] = useState<KindFilter>((searchParams.get("kind") as KindFilter) || "all")
  const [type, setType] = useState<TypeFilter>("all")
  const selectedKey = searchParams.get("item")

  const loadQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/review")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setItems(data.items)
      setFailed(false)
      return data.items as QueueItem[]
    } catch {
      setFailed(true)
      return null
    }
  }, [])

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  const select = useCallback(
    (key: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (key) params.set("item", key)
      else params.delete("item")
      router.replace(`${pathname}${params.toString() ? `?${params}` : ""}`, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  // Load whichever item the URL points at, so a review can be linked to.
  useEffect(() => {
    if (!selectedKey) return setDetail(null)
    const [t, id] = selectedKey.split(":")
    let cancelled = false
    setLoadingDetail(true)
    fetch(`/api/admin/review/${t}/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => !cancelled && setDetail(d.detail))
      .catch(() => {
        if (cancelled) return
        toast.error("Couldn't open that item.")
        setDetail(null)
      })
      .finally(() => !cancelled && setLoadingDetail(false))
    return () => {
      cancelled = true
    }
  }, [selectedKey])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (items ?? []).filter(
      (i) =>
        (kind === "all" || i.kind === kind) &&
        (type === "all" || i.type === type) &&
        (!q || `${i.title} ${i.subjectName} ${i.context} ${i.author?.name ?? ""} ${i.submittedBy?.name ?? ""}`.toLowerCase().includes(q)),
    )
  }, [items, kind, type, query])

  // On wide screens, open the first item rather than showing an empty pane.
  useEffect(() => {
    if (selectedKey || !filtered.length || typeof window === "undefined") return
    if (window.matchMedia("(min-width: 1024px)").matches) select(filtered[0].key)
  }, [filtered, selectedKey, select])

  async function decided(next: ReviewDetail, action: ReviewAction) {
    toast.success(DONE_MESSAGE[action as keyof typeof DONE_MESSAGE] ?? "Done")
    const index = filtered.findIndex((i) => i.key === selectedKey)
    const fresh = await loadQueue()
    const remaining = (fresh ?? []).filter((i) => filtered.some((f) => f.key === i.key) && i.key !== selectedKey)
    // Straight on to the next one.
    const nextItem = remaining[Math.min(Math.max(index, 0), remaining.length - 1)]
    if (nextItem) select(nextItem.key)
    else {
      setDetail(next)
      select(null)
    }
  }

  const counts = {
    all: items?.length ?? 0,
    new: items?.filter((i) => i.kind === "new").length ?? 0,
    edit: items?.filter((i) => i.kind === "edit").length ?? 0,
  }

  const showDetailOnMobile = !!selectedKey

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-0">
      {/* Queue */}
      <aside
        className={cn(
          "flex min-h-0 w-full flex-col border-r border-border bg-sidebar lg:w-[400px] lg:shrink-0",
          showDetailOnMobile && "hidden lg:flex",
        )}
        aria-label="Review queue"
      >
        <div className="space-y-3 border-b border-border p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="font-heading text-xl font-bold text-foreground">Review</h1>
              <p className="text-xs text-muted-foreground">
                {items ? (counts.all ? `${counts.all} waiting, longest first` : "Nothing waiting") : "Loading"}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={loadQueue} aria-label="Refresh queue">
              <RotateCw className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <label htmlFor="review-search" className="sr-only">
              Search the queue
            </label>
            <Input
              id="review-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles, subjects or people"
              className="h-10 bg-background pl-9"
            />
          </div>
          <Segmented<KindFilter>
            label="Kind"
            value={kind}
            onChange={setKind}
            options={[
              { id: "all", label: "All", count: counts.all },
              { id: "new", label: "New", count: counts.new },
              { id: "edit", label: "Edits", count: counts.edit },
            ]}
          />
          <Segmented<TypeFilter>
            label="Content type"
            value={type}
            onChange={setType}
            options={[
              { id: "all", label: "Everything" },
              { id: "question", label: "Questions" },
              { id: "lesson", label: "Lessons" },
              { id: "course", label: "Courses" },
            ]}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {failed ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center" role="alert">
              <AlertTriangle className="h-6 w-6 text-warning" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Couldn’t load the queue.</p>
              <Button variant="outline" size="sm" onClick={loadQueue}>
                Try again
              </Button>
            </div>
          ) : !items ? (
            <div className="space-y-px">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 px-4 py-4">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-6 w-6 text-success" aria-hidden="true" />
              </span>
              <p className="mt-4 font-medium text-foreground">{counts.all ? "Nothing matches" : "All caught up"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {counts.all ? "Try a different filter." : "New submissions and proposed edits land here."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((item) => (
                <QueueRow key={item.key} item={item} active={item.key === selectedKey} onSelect={() => select(item.key)} />
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Detail */}
      <main className={cn("min-h-0 min-w-0 flex-1 bg-background", !showDetailOnMobile && "hidden lg:block")}>
        {loadingDetail && !detail ? (
          <div className="space-y-6 p-6">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-7 w-3/4" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
            <Skeleton className="h-72 rounded-xl" />
          </div>
        ) : detail ? (
          <div className={cn("h-full transition-opacity", loadingDetail && "opacity-60")}>
            <ReviewDetailPane detail={detail} onChange={setDetail} onDecided={decided} onBack={() => select(null)} />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <ClipboardCheck className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            </span>
            <p className="mt-4 font-medium text-foreground">Pick something to review</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">You’ll see the content, what changed, its MOS links and the conversation so far.</p>
          </div>
        )}
      </main>
    </div>
  )
}
