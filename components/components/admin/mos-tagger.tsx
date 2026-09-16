"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AlertCircle, Check, Loader2, Plus, RotateCw, Search, ShieldCheck, Sparkles, Star, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@lib/utils"
import { mosId, type MosItemSummary, type MosLink } from "@lib/mos/subjects"

interface Suggestion {
  item: MosItemSummary
  confidence: number
}

type SuggestState =
  | { kind: "idle" }
  | { kind: "short" }
  | { kind: "loading" }
  | { kind: "ready"; suggestions: Suggestion[] }
  | { kind: "empty-library" }
  | { kind: "error"; message: string }

const MIN_MATCH_CHARS = 40
const DEBOUNCE_MS = 1200

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const tone = pct >= 70 ? "bg-success" : pct >= 40 ? "bg-primary" : "bg-muted-foreground/40"
  return (
    <span className="flex items-center gap-2" title="Wording match">
      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <span className={cn("block h-full rounded-full", tone)} style={{ width: `${Math.max(4, pct)}%` }} />
      </span>
      <span className="w-9 text-right text-xs font-medium text-foreground" data-tabular>
        {pct}%
      </span>
      <span className="sr-only">match</span>
    </span>
  )
}

function ItemText({ item }: { item: MosItemSummary }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="font-mono text-xs font-semibold text-foreground">{mosId(item.unitCode, item.ref)}</span>
        <span className="truncate text-xs text-muted-foreground">
          {[item.topicTitle, item.subtopicTitle].filter(Boolean).join(" › ")}
        </span>
      </p>
      <p className="mt-0.5 line-clamp-2 text-sm text-foreground">{item.fullText}</p>
    </div>
  )
}

/**
 * Links a question or lesson to Part 61 MOS Schedule 3 items.
 *
 * Suggestions come from a semantic match on the draft as it's written; the
 * curator confirms with one click, so a person makes every mapping decision.
 * Search covers the cases the match misses.
 */
export function MosTagger({
  subjectId,
  matchText,
  value,
  onChange,
  contentType,
  contentId,
  error,
  isAdmin = false,
}: {
  subjectId: string
  /** The draft's words, used for suggestions. */
  matchText: string
  /** Undefined while an existing item's links are still loading. */
  value: MosLink[] | undefined
  onChange: (links: MosLink[]) => void
  contentType: "question" | "lesson"
  contentId?: string
  error?: string
  isAdmin?: boolean
}) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const links = value ?? []

  const [loadError, setLoadError] = useState(false)
  const [state, setState] = useState<SuggestState>({ kind: "idle" })
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<MosItemSummary[] | null>(null)
  const [searching, setSearching] = useState(false)
  const lastMatched = useRef("")
  const [refreshKey, setRefreshKey] = useState(0)
  /** Set by the Refresh button so the next fetch skips the typing debounce. */
  const immediate = useRef(false)

  // Existing links for saved content; new content starts empty.
  useEffect(() => {
    if (value !== undefined) return
    if (!contentId) {
      onChangeRef.current([])
      return
    }
    let cancelled = false
    fetch(`/api/admin/mos/mappings?contentType=${contentType}&contentId=${contentId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => !cancelled && onChangeRef.current(d.links ?? []))
      .catch(() => !cancelled && setLoadError(true))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, contentType])

  // Suggestions follow the draft, debounced.
  useEffect(() => {
    const text = matchText.trim()
    if (text.length < MIN_MATCH_CHARS) {
      setState({ kind: "short" })
      lastMatched.current = ""
      return
    }
    const key = `${subjectId}\n${text}\n${refreshKey}`
    if (key === lastMatched.current) return

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      lastMatched.current = key
      setState((s) => (s.kind === "ready" ? s : { kind: "loading" }))
      try {
        const res = await fetch("/api/admin/mos/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subjectId, text }),
          signal: controller.signal,
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setState({ kind: "error", message: data.error || "Suggestions aren't available right now." })
        } else if (data.code === "library-empty") {
          setState({ kind: "empty-library" })
        } else {
          setState({ kind: "ready", suggestions: data.suggestions ?? [] })
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") setState({ kind: "error", message: "Suggestions aren't available right now." })
      }
    }, immediate.current ? 0 : DEBOUNCE_MS)
    immediate.current = false

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [matchText, subjectId, refreshKey])

  // Manual search, debounced lightly.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults(null)
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/admin/mos/items?subjectId=${encodeURIComponent(subjectId)}&q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        })
        const data = await res.json()
        setResults(data.items ?? [])
      } catch {
        /* aborted or offline; keep the last results */
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, subjectId])

  const linkedIds = new Set(links.map((l) => l.itemId))
  const primary = links.find((l) => l.primary)

  const add = (item: MosItemSummary, source: "suggested" | "manual", confidence: number | null = null) => {
    if (linkedIds.has(item.id)) return
    onChange([...links, { itemId: item.id, primary: !primary, source, confidence, item }])
  }
  const remove = (itemId: string) => {
    const next = links.filter((l) => l.itemId !== itemId)
    if (next.length && !next.some((l) => l.primary)) next[0] = { ...next[0], primary: true }
    onChange(next)
  }
  const makePrimary = (itemId: string) => onChange(links.map((l) => ({ ...l, primary: l.itemId === itemId })))
  /** Confirms a link a MOS update flagged as reworded; saved with the content. */
  const confirmLink = (itemId: string) =>
    onChange(links.map((l) => (l.itemId === itemId ? { ...l, needsReview: false, reviewed: true, reviewNote: null } : l)))

  const suggestions = state.kind === "ready" ? state.suggestions.filter((s) => !linkedIds.has(s.item.id)).slice(0, 3) : []

  return (
    <section aria-labelledby="mos-tagger-title" className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
          </span>
          <div>
            <h3 id="mos-tagger-title" className="text-sm font-semibold text-foreground">
              Part 61 MOS mapping
            </h3>
            <p className="text-xs text-muted-foreground">Publishing needs a primary item.</p>
          </div>
        </div>
        {value !== undefined &&
          (primary?.item ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-medium text-foreground">
              <Check className="h-3 w-3 text-success" aria-hidden="true" />
              Primary {mosId(primary.item.unitCode, primary.item.ref)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-xs font-medium text-foreground">
              <AlertCircle className="h-3 w-3 text-warning" aria-hidden="true" />
              No primary
            </span>
          ))}
      </header>

      {/* Linked */}
      {value === undefined ? (
        loadError ? (
          <p className="text-sm text-destructive">Couldn&apos;t load links. Saving won&apos;t change them.</p>
        ) : (
          <Skeleton className="h-14 w-full" />
        )
      ) : links.length > 0 ? (
        <ul className="space-y-2" aria-label="Linked MOS items">
          {links.map((l) => (
            <li
              key={l.itemId}
              className={cn(
                "flex items-start gap-2 rounded-lg border p-2.5",
                l.primary ? "border-primary/40 bg-primary/5" : "border-border",
              )}
            >
              <button
                type="button"
                onClick={() => makePrimary(l.itemId)}
                aria-pressed={l.primary}
                aria-label={l.primary ? "Primary item" : "Make primary"}
                title={l.primary ? "Primary" : "Make primary"}
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Star className={cn("h-4 w-4", l.primary ? "fill-primary text-primary" : "text-muted-foreground")} aria-hidden="true" />
              </button>
              <div className="min-w-0 flex-1">
                {l.item ? <ItemText item={l.item} /> : <p className="text-sm text-muted-foreground">Unknown item</p>}
                {l.needsReview && l.reviewReason === "reworded" && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-2 py-1.5">
                    <span className="text-xs text-foreground">Reworded in the latest MOS.</span>
                    <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => confirmLink(l.itemId)}>
                      Still fits
                    </Button>
                  </div>
                )}
                {l.item?.retired && (
                  <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs text-foreground">
                    No longer in the MOS. Link a replacement.
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-[11px] text-muted-foreground">
                  {l.primary ? "Primary" : "Secondary"}
                  {l.source === "suggested" && l.confidence != null ? ` · ${Math.round(l.confidence * 100)}%` : ""}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => remove(l.itemId)}
                aria-label={`Remove ${l.item ? mosId(l.item.unitCode, l.item.ref) : "link"}`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground">
          Nothing linked yet.
        </p>
      )}

      {/* Suggestions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Suggested
          </p>
          {(state.kind === "ready" || state.kind === "error") && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground"
              onClick={() => {
                immediate.current = true
                setRefreshKey((k) => k + 1)
              }}
            >
              <RotateCw className="h-3 w-3" aria-hidden="true" />
              Refresh
            </Button>
          )}
        </div>

        <div aria-live="polite">
          {state.kind === "short" || state.kind === "idle" ? (
            <p className="text-sm text-muted-foreground">Keep writing for suggestions.</p>
          ) : state.kind === "loading" ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : state.kind === "empty-library" ? (
            <p className="text-sm text-muted-foreground">
              Schedule 3 isn&apos;t loaded.{" "}
              {isAdmin ? (
                <Link href="/admin/mos" className="font-medium text-primary underline-offset-4 hover:underline">
                  Load it
                </Link>
              ) : (
                "Ask an admin to load it."
              )}
            </p>
          ) : state.kind === "error" ? (
            <p className="text-sm text-muted-foreground">{state.message}</p>
          ) : suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No more suggestions.</p>
          ) : (
            <ul className="space-y-2" aria-label="Suggested MOS items">
              {suggestions.map((s) => (
                <li key={s.item.id} className="flex items-start gap-3 rounded-lg border border-border p-2.5 transition-colors hover:border-primary/40">
                  <ItemText item={s.item} />
                  <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                    <ConfidenceMeter value={s.confidence} />
                    <Button type="button" size="sm" className="h-8 gap-1" onClick={() => add(s.item, "suggested", s.confidence)}>
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Link
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor={`mos-search-${contentType}`} className="text-xs font-medium text-muted-foreground">
          Search
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            id={`mos-search-${contentType}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="2.1.1 or stall speed"
            className="h-10 pl-9"
            autoComplete="off"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden="true" />
          )}
        </div>
        {results && (
          <ul className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-border p-1" aria-label="Search results">
            {results.length === 0 ? (
              <li className="px-2 py-2 text-sm text-muted-foreground">No matches.</li>
            ) : (
              results.map((item) => {
                const linked = linkedIds.has(item.id)
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={linked}
                      onClick={() => add(item, "manual")}
                      className="flex w-full items-start gap-3 rounded-md px-2 py-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent"
                    >
                      <ItemText item={item} />
                      {linked ? (
                        <Check className="mt-1 h-4 w-4 shrink-0 text-success" aria-label="Linked" />
                      ) : (
                        <Plus className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      )}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        )}
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </section>
  )
}
