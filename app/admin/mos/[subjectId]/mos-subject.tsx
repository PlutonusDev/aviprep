"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  ChevronDown,
  Download,
  EyeOff,
  FileQuestion,
  FileSpreadsheet,
  FileText,
  Gauge,
  GitCompareArrows,
  ListChecks,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyState, PageShell, StatTile } from "@/components/hub/page-primitives"
import { CoverageBar, CoverageLegend, LibraryPanel, StatusBadge } from "@/components/admin/mos-ui"
import { cn } from "@lib/utils"
import { MIN_QUESTIONS_PER_ITEM, type MosStatus } from "@lib/mos/subjects"
import type { CoverageDetail, ItemCoverage, ReviewItem } from "@lib/mos/coverage"
import type { LibraryStatus } from "@lib/mos/library"
import { useStudioActivity } from "@/components/curators/presence-beacon"
import { useUser } from "@lib/user-context"

type Filter = "attention" | "all" | "missing" | "low" | "draft" | "excluded"
type View = "review" | "items" | "content" | "modules"

interface Payload extends CoverageDetail {
  library: LibraryStatus
  role: "admin" | "curator"
}

const FILTERS: { id: Filter; label: string; match: (s: MosStatus) => boolean }[] = [
  { id: "attention", label: "Needs attention", match: (s) => s === "missing" || s === "low" || s === "draft" },
  { id: "missing", label: "Not mapped", match: (s) => s === "missing" },
  { id: "low", label: "Low on questions", match: (s) => s === "low" },
  { id: "draft", label: "Drafts only", match: (s) => s === "draft" },
  { id: "excluded", label: "Excluded", match: (s) => s === "excluded" },
  { id: "all", label: "All items", match: () => true },
]

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  )
}

/** One link a MOS update flagged: what it pointed at, what changed, and one-click fixes. */
function ReviewRow({ review, subjectId, onDone }: { review: ReviewItem; subjectId: string; onDone: () => void }) {
  const [busy, setBusy] = useState<string | null>(null)

  async function act(action: "confirm" | "move" | "remove", itemId?: string) {
    setBusy(itemId ?? action)
    try {
      const res = await fetch("/api/admin/mos/mappings/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappingId: review.mappingId, action, itemId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error)
      toast.success(action === "confirm" ? "Link kept" : action === "move" ? "Link moved" : "Link removed")
      onDone()
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Couldn't update the link")
      setBusy(null)
    }
  }

  const editHref =
    review.contentType === "question"
      ? `/admin/questions?subject=${subjectId}&edit=${review.contentId}`
      : `/admin/courses/${review.courseId}/lesson/${review.contentId}`
  const removed = review.reason === "removed"

  return (
    <li className="space-y-3 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {review.contentType === "question" ? "Question" : "Lesson"}
            {review.contentContext && ` · ${review.contentContext}`}
            {!review.live && " · draft"}
            {review.primary && " · primary link"}
          </p>
          <Link href={editHref} className="line-clamp-2 text-sm font-medium text-foreground hover:underline">
            {review.contentLabel || "Untitled"}
          </Link>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium text-foreground",
            removed ? "border-destructive/30 bg-destructive/10" : "border-warning/40 bg-warning/10",
          )}
        >
          {removed ? "Item removed" : "Item reworded"}
        </span>
      </div>

      <div className="rounded-lg bg-muted/50 p-3 text-sm">
        <p className="font-mono text-xs font-semibold text-foreground">{review.item.mosId}</p>
        <p className={cn("mt-1", removed ? "text-muted-foreground" : "text-foreground")}>{review.item.fullText}</p>
        {!removed && review.note && <p className="mt-1.5 text-xs text-muted-foreground">{review.note}</p>}
      </div>

      {removed && review.suggestions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Move the link to</p>
          <ul className="space-y-1.5">
            {review.suggestions.map((sug) => (
              <li key={sug.id} className="flex items-start gap-3 rounded-lg border border-border p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs font-semibold text-foreground">{sug.mosId}</p>
                  <p className="line-clamp-2 text-sm text-foreground">{sug.fullText}</p>
                </div>
                <Button size="sm" className="h-8 shrink-0" disabled={!!busy} onClick={() => act("move", sug.id)}>
                  {busy === sug.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : "Move here"}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!removed && (
          <Button size="sm" className="h-8" disabled={!!busy} onClick={() => act("confirm")}>
            {busy === "confirm" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            Still fits
          </Button>
        )}
        <Button asChild variant="outline" size="sm" className="h-8">
          <Link href={editHref}>{removed ? "Pick another" : "Open"}</Link>
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" disabled={!!busy} onClick={() => act("remove")}>
          {busy === "remove" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          Remove link
        </Button>
      </div>
    </li>
  )
}

function ItemRow({
  item,
  subjectId,
  isAdmin,
  onExclude,
}: {
  item: ItemCoverage
  subjectId: string
  isAdmin: boolean
  onExclude: (item: ItemCoverage) => void
}) {
  const liveLessons = item.lessons.filter((l) => l.live)
  const draftLessons = item.lessons.length - liveLessons.length
  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-foreground">{item.mosId}</span>
          <StatusBadge status={item.status} />
        </div>
        <p className={cn("mt-1 text-sm", item.excluded ? "text-muted-foreground" : "text-foreground")}>{item.fullText}</p>
        {item.excluded && item.excludedReason && (
          <p className="mt-1 text-xs text-muted-foreground">Excluded: {item.excludedReason}</p>
        )}
        {liveLessons.length > 0 && (
          <ul className="mt-2 space-y-0.5">
            {liveLessons.slice(0, 3).map((l) => (
              <li key={l.id} className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                <BookOpen className="h-3 w-3 shrink-0" aria-hidden="true" />
                <Link href={`/admin/courses/${l.courseId}/lesson/${l.id}`} className="truncate hover:text-foreground hover:underline">
                  {l.courseTitle} › {l.moduleTitle} › {l.title}
                </Link>
              </li>
            ))}
            {liveLessons.length > 3 && <li className="text-xs text-muted-foreground">+{liveLessons.length - 3} more lessons</li>}
          </ul>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-4 sm:pt-0.5">
        <dl className="flex gap-4 text-right">
          <div>
            <dt className="text-[11px] text-muted-foreground">Questions</dt>
            <dd className="text-sm font-semibold text-foreground" data-tabular>
              {item.liveQuestions}
              {item.draftQuestions > 0 && <span className="ml-1 text-xs font-normal text-muted-foreground">+{item.draftQuestions} draft</span>}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">Lessons</dt>
            <dd className="text-sm font-semibold text-foreground" data-tabular>
              {liveLessons.length}
              {draftLessons > 0 && <span className="ml-1 text-xs font-normal text-muted-foreground">+{draftLessons} draft</span>}
            </dd>
          </div>
        </dl>

        {!item.excluded && item.status !== "covered" && (
          // Solid where there's nothing at all, quieter where it's only thin:
          // the empty standards are the ones worth walking towards.
          <Button asChild variant={item.status === "missing" ? "default" : "outline"} size="sm" className="h-8 gap-1.5">
            <Link href={`/admin/questions?subject=${subjectId}&new=1&mos=${item.id}`}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Write<span className="hidden sm:inline"> a question</span>
            </Link>
          </Button>
        )}

        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`More actions for ${item.mosId}`}>
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/admin/questions?subject=${subjectId}&new=1&mos=${item.id}`}>Write a question</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExclude(item)}>
                <EyeOff className="mr-2 h-4 w-4" aria-hidden="true" />
                {item.excluded ? "Include in coverage" : "Exclude from coverage"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </li>
  )
}

export function MosSubject({ subjectId }: { subjectId: string }) {
  const { user } = useUser()
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View | null>(null)
  const [filter, setFilter] = useState<Filter>("attention")
  const [query, setQuery] = useState("")
  /**
   * Which unit groups are open. Empty to begin with: a subject is 100-odd
   * standards, and a wall of them on arrival buries the two or three that
   * actually need writing.
   */
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)
  const [excluding, setExcluding] = useState<ItemCoverage | null>(null)
  const [reason, setReason] = useState("")
  const [savingExclude, setSavingExclude] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/mos/coverage/${subjectId}`)
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || "Couldn't load coverage.")
      setData(body)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load coverage.")
    }
  }, [subjectId])

  useEffect(() => {
    load()
  }, [load])

  useStudioActivity(data?.summary?.code || subjectId)

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { attention: 0, all: 0, missing: 0, low: 0, draft: 0, excluded: 0 }
    for (const i of data?.items ?? []) for (const f of FILTERS) if (f.match(i.status)) c[f.id]++
    return c
  }, [data])

  const groups = useMemo(() => {
    const match = FILTERS.find((f) => f.id === filter)!.match
    const q = query.trim().toLowerCase()
    const out: { key: string; label: string; items: ItemCoverage[]; mapped: number; assessable: number }[] = []
    const all = new Map<string, { mapped: number; assessable: number }>()
    for (const i of data?.items ?? []) {
      const key = `${i.unitNumber}:${i.topicNumber}`
      const t = all.get(key) ?? { mapped: 0, assessable: 0 }
      if (i.status !== "excluded") t.assessable++
      if (i.status === "covered" || i.status === "low") t.mapped++
      all.set(key, t)
    }
    for (const i of data?.items ?? []) {
      if (!match(i.status)) continue
      if (q && !`${i.mosId} ${i.fullText} ${i.topicTitle} ${i.subtopicTitle}`.toLowerCase().includes(q)) continue
      const key = `${i.unitNumber}:${i.topicNumber}`
      let g = out.find((x) => x.key === key)
      if (!g) {
        g = { key, label: `${i.unitCode} ${i.topicNumber}. ${i.topicTitle}`, items: [], ...all.get(key)! }
        out.push(g)
      }
      g.items.push(i)
    }
    return out
  }, [data, filter, query])

  const searching = query.trim().length > 0
  const allOpen = groups.length > 0 && groups.every((g) => expanded.has(g.key))
  async function exportPdf() {
    if (!data) return
    setExporting(true)
    try {
      const { downloadMatrixPdf } = await import("@/components/admin/mos-pdf")
      await downloadMatrixPdf(data, data.library)
    } catch (e) {
      console.error(e)
      toast.error("Couldn't create the PDF")
    } finally {
      setExporting(false)
    }
  }

  async function saveExclude() {
    if (!excluding) return
    setSavingExclude(true)
    try {
      const res = await fetch(`/api/admin/mos/items/${excluding.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excluded: !excluding.excluded, reason }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error)
      toast.success(excluding.excluded ? `${excluding.mosId} counts towards coverage again` : `${excluding.mosId} excluded`)
      setExcluding(null)
      setReason("")
      await load()
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Couldn't update the item")
    } finally {
      setSavingExclude(false)
    }
  }

  if (error) {
    return (
      <PageShell>
        <BackLink isAdmin={!!user?.isAdmin} />
        <div role="alert">
          <EmptyState icon={AlertTriangle} title="Couldn't load coverage" description={error} />
        </div>
      </PageShell>
    )
  }

  if (!data) {
    return (
      <PageShell>
        <BackLink isAdmin={!!user?.isAdmin} />
        <div className="space-y-3">
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[88px] rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </PageShell>
    )
  }

  const s = data.summary
  const isAdmin = data.role === "admin"
  // Open on the review queue while there is one.
  const activeView: View = view ?? (data.reviews.length ? "review" : "items")
  const notMapped = s.assessable - s.mapped
  const unlinked = s.unmappedQuestions + s.unmappedLessons

  return (
    <PageShell>
      <BackLink isAdmin={!!user?.isAdmin} />

      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-1.5">
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-sm font-semibold text-foreground">{s.code}</span>
            <span className="uppercase">{s.licence}</span>
            <span aria-hidden="true">·</span>
            <span>{s.units.filter((u) => !u.reserved).map((u) => `${u.number} ${u.code}`).join(", ")}</span>
          </p>
          <h1 className="text-display-3 font-bold text-foreground">{s.name}</h1>
          <p className="text-muted-foreground">
            {s.assessable === 0
              ? "No Schedule 3 items for this subject."
              : notMapped === 0
                ? `All ${s.assessable} items mapped.`
                : `${s.percent}% mapped, ${notMapped} item${notMapped === 1 ? "" : "s"} missing.`}
          </p>
        </div>

        {data.library.loaded && (
          <div className="flex shrink-0 gap-2">
            <Button onClick={exportPdf} disabled={exporting} className="h-10 gap-2">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
              Export PDF
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 gap-2">
                  <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                  CSV
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">

                <DropdownMenuItem asChild>
                  <a href={`/api/admin/mos/export?subjectId=${subjectId}&view=items`} download>
                    <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                    By MOS item
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={`/api/admin/mos/export?subjectId=${subjectId}&view=modules`} download>
                    <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                    By module
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </header>

      <LibraryPanel library={data.library} isAdmin={isAdmin} onLoaded={() => load()} />

      {data.library.loaded && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile icon={Gauge} label="Mapped" value={`${s.percent}%`} detail={`${s.mapped} of ${s.assessable} items`} />
            <StatTile icon={ListChecks} label="Not mapped" value={String(notMapped)} detail={s.draftOnly ? `${s.draftOnly} in draft` : undefined} />
            <StatTile icon={AlertTriangle} label="Low on questions" value={String(s.lowDensity)} detail={`Fewer than ${MIN_QUESTIONS_PER_ITEM}`} />
            <StatTile icon={FileQuestion} label="Unlinked content" value={String(unlinked)} detail={`${s.unmappedQuestions} questions · ${s.unmappedLessons} lessons`} />
          </div>

          <div className="space-y-2">
            <CoverageBar covered={s.mapped - s.lowDensity} low={s.lowDensity} draft={s.draftOnly} total={s.assessable} className="h-2.5" />
            <CoverageLegend />
          </div>

          {data.retiredLinks > 0 && (
            <p className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
              {data.retiredLinks} link{data.retiredLinks === 1 ? " points" : "s point"} to items no longer in the MOS.
            </p>
          )}

          <div role="tablist" aria-label="Coverage views" className="flex gap-1 overflow-x-auto border-b border-border">
            {(
              [
                ...(data.reviews.length || view === "review" ? [{ id: "review", label: "To review", count: data.reviews.length }] : []),
                { id: "items", label: "Items", count: s.assessable + s.excluded },
                { id: "content", label: "Unlinked", count: data.unmappedQuestions.length + data.unmappedLessons.length },
                { id: "modules", label: "Modules", count: data.modules.length },
              ] as { id: View; label: string; count: number }[]
            ).map((t) => (
              <button
                key={t.id}
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={activeView === t.id}
                aria-controls={`panel-${t.id}`}
                onClick={() => setView(t.id)}
                className={cn(
                  "-mb-px inline-flex h-11 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  activeView === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
                <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground" data-tabular>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {activeView === "review" && (
            <section id="panel-review" role="tabpanel" aria-labelledby="tab-review" className="space-y-3">
              <p className="text-sm text-muted-foreground">Changed in the last MOS update.</p>
              {data.reviews.length === 0 ? (
                <EmptyState icon={GitCompareArrows} title="All done" description="Nothing left to review." />
              ) : (
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-e1">
                  {[...data.reviews]
                    .sort((a, b) => Number(b.reason === "removed") - Number(a.reason === "removed") || Number(b.live) - Number(a.live))
                    .map((r) => (
                      <ReviewRow key={r.mappingId} review={r} subjectId={subjectId} onDone={load} />
                    ))}
                </ul>
              )}
            </section>
          )}

          {activeView === "items" && (
            <section id="panel-items" role="tabpanel" aria-labelledby="tab-items" className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div role="group" aria-label="Filter items" className="flex flex-wrap gap-1.5">
                  {FILTERS.map((f) =>
                    counts[f.id] || f.id === "attention" || f.id === "all" ? (
                      <Chip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>
                        {f.label}
                        <span className={cn("text-xs", filter === f.id ? "text-primary-foreground/80" : "text-muted-foreground")} data-tabular>
                          {counts[f.id]}
                        </span>
                      </Chip>
                    ) : null,
                  )}
                </div>
                <div className="flex w-full items-center gap-2 lg:w-auto">
                  <div className="relative min-w-0 flex-1 lg:w-72 lg:flex-none">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Label htmlFor="mos-item-search" className="sr-only">
                      Search items
                    </Label>
                    <Input
                      id="mos-item-search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search items"
                      className="h-9 pl-9"
                    />
                  </div>
                  {groups.length > 1 && !searching && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 shrink-0"
                      onClick={() => setExpanded(allOpen ? new Set() : new Set(groups.map((g) => g.key)))}
                    >
                      {allOpen ? "Close all" : "Open all"}
                    </Button>
                  )}
                </div>
              </div>

              {groups.length === 0 ? (
                <EmptyState
                  icon={ListChecks}
                  title={filter === "attention" && !query ? "All covered" : "No matches"}
                  description={filter === "attention" && !query ? "Nothing needs attention." : "Try another filter."}
                />
              ) : (
                <div className="space-y-3">
                  {groups.map((g) => {
                    // Searching opens what it found: hiding the matches
                    // behind a chevron is the one thing a search can't do.
                    const open = expanded.has(g.key) || searching
                    return (
                      <section key={g.key} className="overflow-hidden rounded-xl border border-border bg-card shadow-e1">
                        <button
                          type="button"
                          aria-expanded={open}
                          onClick={() =>
                            setExpanded((open) => {
                              const next = new Set(open)
                              if (next.has(g.key)) next.delete(g.key)
                              else next.add(g.key)
                              return next
                            })
                          }
                          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        >
                          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")} aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate font-medium text-foreground">{g.label}</span>
                          {(() => {
                            const toWrite = g.items.filter((i) => !i.excluded && i.status !== "covered").length
                            return toWrite > 0 ? (
                              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary" data-tabular>
                                {toWrite} to write
                              </span>
                            ) : null
                          })()}
                          <span className="hidden text-xs text-muted-foreground sm:inline" data-tabular>
                            {g.mapped}/{g.assessable} mapped
                          </span>
                          <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-muted sm:block" aria-hidden="true">
                            <span className="block h-full rounded-full bg-success" style={{ width: `${g.assessable ? (g.mapped / g.assessable) * 100 : 0}%` }} />
                          </span>
                          {filter !== "all" && (
                            <span className="rounded-full bg-muted px-2 text-xs text-muted-foreground" data-tabular>
                              {g.items.length}
                            </span>
                          )}
                        </button>
                        {open && (
                          <ul className="divide-y divide-border border-t border-border">
                            {g.items.map((i) => (
                              <ItemRow
                                key={i.id}
                                item={i}
                                subjectId={subjectId}
                                isAdmin={isAdmin}
                                onExclude={(item) => {
                                  setReason(item.excludedReason ?? "")
                                  setExcluding(item)
                                }}
                              />
                            ))}
                          </ul>
                        )}
                      </section>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {activeView === "content" && (
            <section id="panel-content" role="tabpanel" aria-labelledby="tab-content" className="grid gap-6 lg:grid-cols-2">
              <div className="min-w-0">
                <h2 className="mb-1 text-base font-semibold text-foreground">Live questions</h2>
                <p className="mb-3 text-sm text-muted-foreground">Published with no primary item.</p>
                {data.unmappedQuestions.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">All mapped.</p>
                ) : (
                  <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                    {data.unmappedQuestions.map((q) => (
                      <li key={q.id} className="flex items-start gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs text-muted-foreground">{q.topic}</p>
                          <p className="line-clamp-2 text-sm text-foreground">{q.questionText}</p>
                        </div>
                        <Button asChild variant="outline" size="sm" className="h-8 shrink-0">
                          <Link href={`/admin/questions?subject=${subjectId}&edit=${q.id}`}>Map</Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                {s.unmappedQuestions > data.unmappedQuestions.length && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Showing {data.unmappedQuestions.length} of {s.unmappedQuestions}.
                  </p>
                )}
              </div>

              <div className="min-w-0">
                <h2 className="mb-1 text-base font-semibold text-foreground">Lessons</h2>
                <p className="mb-3 text-sm text-muted-foreground">Lessons must be linked before a course goes live.</p>
                {data.unmappedLessons.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">All mapped.</p>
                ) : (
                  <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                    {data.unmappedLessons.map((l) => (
                      <li key={l.id} className="flex items-start gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs text-muted-foreground">
                            {l.courseTitle} › {l.moduleTitle}
                          </p>
                          <p className="flex items-center gap-2 text-sm text-foreground">
                            <span className="truncate">{l.title}</span>
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2 py-0.5 text-[11px]",
                                l.live ? "bg-success/10 text-foreground" : "bg-muted text-muted-foreground",
                              )}
                            >
                              {l.live ? "Live" : "Draft course"}
                            </span>
                          </p>
                        </div>
                        <Button asChild variant="outline" size="sm" className="h-8 shrink-0">
                          <Link href={`/admin/courses/${l.courseId}/lesson/${l.id}`}>Map</Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}

          {activeView === "modules" && (
            <section id="panel-modules" role="tabpanel" aria-labelledby="tab-modules" className="space-y-3">
              {data.modules.length === 0 ? (
                <EmptyState icon={BookOpen} title="No courses yet" description="Add a course to see its modules here." />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-e1">
                  <table className="w-full min-w-[720px] text-sm">
                    <caption className="sr-only">AviPrep modules cross-referenced to Schedule 3</caption>
                    <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                      <tr>
                        <th scope="col" className="px-4 py-2.5 font-medium">Module</th>
                        <th scope="col" className="px-4 py-2.5 font-medium">Lesson</th>
                        <th scope="col" className="px-4 py-2.5 font-medium">Primary</th>
                        <th scope="col" className="px-4 py-2.5 font-medium">All mapped items</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.modules.flatMap((m) =>
                        (m.lessons.length ? m.lessons : [null]).map((l, i) => (
                          <tr key={`${m.moduleId}-${l?.id ?? "empty"}`} className="align-top">
                            {i === 0 && (
                              <th scope="row" rowSpan={Math.max(1, m.lessons.length)} className="px-4 py-2.5 text-left font-normal">
                                <span className="block text-xs text-muted-foreground">
                                  {m.courseTitle}
                                  {!m.courseLive && " (draft)"}
                                </span>
                                <span className="font-medium text-foreground">{m.moduleTitle}</span>
                              </th>
                            )}
                            {l ? (
                              <>
                                <td className="px-4 py-2.5">
                                  <Link href={`/admin/courses/${m.courseId}/lesson/${l.id}`} className="text-foreground hover:underline">
                                    {l.title}
                                  </Link>
                                </td>
                                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs">
                                  {l.primaryMosId ?? <span className="font-sans text-warning">Not mapped</span>}
                                </td>
                                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{l.mosIds.join(", ") || "–"}</td>
                              </>
                            ) : (
                              <td colSpan={3} className="px-4 py-2.5 text-muted-foreground">
                                No lessons
                              </td>
                            )}
                          </tr>
                        )),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      )}

      <Dialog open={!!excluding} onOpenChange={(open) => !open && setExcluding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {excluding?.excluded ? "Include" : "Exclude"} {excluding?.mosId}
            </DialogTitle>
            <DialogDescription>
              {excluding?.excluded
                ? "It'll count towards coverage again."
                : "It won't count towards coverage. The reason shows in exports."}
            </DialogDescription>
          </DialogHeader>
          {excluding && !excluding.excluded && (
            <div className="space-y-2">
              <p className="rounded-lg bg-muted/60 p-3 text-sm text-foreground">{excluding.fullText}</p>
              <Label htmlFor="exclude-reason">Reason</Label>
              <Textarea
                id="exclude-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={300}
                placeholder="e.g. List referenced by (a) and (b)"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExcluding(null)}>
              Cancel
            </Button>
            <Button onClick={saveExclude} disabled={savingExclude || (!excluding?.excluded && !reason.trim())}>
              {savingExclude && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {excluding?.excluded ? "Include" : "Exclude"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}

function BackLink({ isAdmin }: { isAdmin: boolean }) {
  return (
    <Button asChild variant="ghost" className="-ml-2 h-9 w-fit gap-1.5 text-muted-foreground">
      <Link href="/admin/mos">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {isAdmin ? "MOS coverage" : "Question bank"}
      </Link>
    </Button>
  )
}
