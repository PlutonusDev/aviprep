"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, ArrowRight, Check, Download, FileText, GitCompareArrows, History, Library, Link2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@lib/utils"
import type { LibraryStatus } from "@lib/mos/library"
import type { ChangeReport, ReportStatus } from "@lib/mos/change-report"

type Tab = "reworded" | "removed" | "moved" | "added"
type Preview = ChangeReport & { upToDate: boolean }

const LIST_CAP = 300

function Count({ label, value, tone }: { label: string; value: number; tone?: "warn" | "bad" }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p
        className={cn(
          "text-xl font-semibold text-foreground",
          tone === "warn" && value > 0 && "text-warning",
          tone === "bad" && value > 0 && "text-destructive",
        )}
        data-tabular
      >
        {value.toLocaleString()}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

/** PDF or CSV of a change report. Works for previews and applied updates alike. */
export function ReportMenu({
  load,
  size = "default",
  label = "Change report",
}: {
  load: () => Promise<{ report: ChangeReport; status: ReportStatus }>
  size?: "default" | "sm"
  label?: string
}) {
  const [busy, setBusy] = useState(false)

  async function download(format: "pdf" | "csv") {
    setBusy(true)
    try {
      const { report, status } = await load()
      const mod = await import("@/components/admin/mos-change-report")
      if (format === "pdf") await mod.downloadChangeReportPdf(report, status)
      else mod.downloadChangeReportCsv(report, status)
    } catch (e) {
      console.error(e)
      toast.error("Couldn't create the report")
    } finally {
      setBusy(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size} className={cn("gap-2", size === "sm" && "h-8")} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => download("pdf")}>
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => download("csv")}>
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function UpdateDialog({
  open,
  onOpenChange,
  preview,
  onApplied,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  preview: Preview
  onApplied: () => void
}) {
  const [applying, setApplying] = useState(false)
  /**
   * Where each removed item's links should go, keyed by MOS ID. Starts on the
   * closest current item so the common case is a glance and an apply; clearing
   * one sends its links to the review queue instead.
   */
  const [remap, setRemap] = useState<Record<string, string>>(() =>
    // Only rows that are actually listed below: nothing moves unseen.
    Object.fromEntries(
      preview.removed
        .slice(0, LIST_CAP)
        .filter((r) => r.links > 0 && r.candidates?.length)
        .map((r) => [r.id, r.candidates![0].id]),
    ),
  )
  const movingLinks = preview.removed.reduce((n, r) => n + (remap[r.id] ? r.links : 0), 0)
  const toReview = preview.removed.reduce((n, r) => n + (remap[r.id] ? 0 : r.links), 0)
  const [tab, setTab] = useState<Tab>(preview.removed.length ? "removed" : preview.reworded.length ? "reworded" : preview.moved.length ? "moved" : "added")
  const c = preview.counts

  async function apply() {
    setApplying(true)
    try {
      const res = await fetch("/api/admin/mos/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply", builtAt: preview.builtAt, remap }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error)
      const r = data.result
      toast.success(
        preview.firstLoad
          ? `Loaded ${r.added.toLocaleString()} items`
          : r.flaggedLinks
            ? `Updated. ${r.flaggedLinks} link${r.flaggedLinks === 1 ? "" : "s"} to review.`
            : r.movedLinks
              ? `Updated. ${r.movedLinks} link${r.movedLinks === 1 ? "" : "s"} moved.`
              : "Updated. All links kept.",
      )
      onOpenChange(false)
      onApplied()
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Couldn't apply the update")
    } finally {
      setApplying(false)
    }
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "removed", label: "Removed", count: c.removed },
    { id: "reworded", label: "Reworded", count: c.reworded },
    { id: "moved", label: "Renumbered", count: c.moved },
    { id: "added", label: "New", count: c.added },
  ]

  return (
    <Dialog open={open} onOpenChange={(o) => !applying && onOpenChange(o)}>
      <DialogContent className="flex max-h-[90dvh] max-w-3xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border p-5">
          <DialogTitle>{preview.firstLoad ? "Load Schedule 3" : "Review MOS update"}</DialogTitle>
          <DialogDescription>
            {preview.firstLoad ? (
              <>Compilation {preview.toCompilation ?? "unknown"}.</>
            ) : (
              <>
                <span className="font-mono">{preview.fromCompilation ?? "Current"}</span>
                <ArrowRight className="mx-1.5 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
                <span className="font-mono">{preview.toCompilation ?? "New build"}</span>. Nothing changes until you apply.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {preview.firstLoad ? (
            <Count label="Items" value={c.added} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <Count label="Unchanged" value={c.unchanged} />
                <Count label="Renumbered" value={c.moved} />
                <Count label="Reworded" value={c.reworded} tone="warn" />
                <Count label="New" value={c.added} />
                <Count label="Removed" value={c.removed} tone="bad" />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <p className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-foreground">
                  <Link2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  <span>
                    <strong data-tabular>{(preview.carriedLinks + movingLinks).toLocaleString()}</strong> link
                    {preview.carriedLinks + movingLinks === 1 ? "" : "s"} kept
                  </span>
                </p>
                <p
                  className={cn(
                    "flex items-center gap-2 rounded-lg border p-3 text-sm text-foreground",
                    preview.flaggedLinks - movingLinks ? "border-warning/40 bg-warning/10" : "border-border bg-muted/40",
                  )}
                >
                  <AlertTriangle
                    className={cn("h-4 w-4 shrink-0", preview.flaggedLinks - movingLinks ? "text-warning" : "text-muted-foreground")}
                    aria-hidden="true"
                  />
                  <span>
                    <strong data-tabular>{(preview.flaggedLinks - movingLinks).toLocaleString()}</strong> link
                    {preview.flaggedLinks - movingLinks === 1 ? "" : "s"} to review
                  </span>
                </p>
              </div>

              {preview.missingUnits.length > 0 && (
                <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-foreground">
                  Missing unit{preview.missingUnits.length === 1 ? "" : "s"}: {preview.missingUnits.map((m) => `${m.code} (${m.subjectId})`).join(", ")}. If
                  CASA renamed a code, update <code className="font-mono text-xs">lib/mos/subjects.ts</code> first.
                </p>
              )}

              <div>
                <div role="tablist" aria-label="Changes" className="flex gap-1 overflow-x-auto border-b border-border">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      role="tab"
                      aria-selected={tab === t.id}
                      onClick={() => setTab(t.id)}
                      className={cn(
                        "-mb-px inline-flex h-10 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t.label}
                      <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground" data-tabular>
                        {t.count}
                      </span>
                    </button>
                  ))}
                </div>

                <div role="tabpanel" className="pt-3">
                  {tab === "removed" &&
                    (preview.removed.length === 0 ? (
                      <Empty text="Nothing removed." />
                    ) : (
                      <>
                        {movingLinks + toReview > 0 && (
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                            <span className="text-muted-foreground">
                              <strong className="font-medium text-foreground" data-tabular>
                                {movingLinks}
                              </strong>{" "}
                              link{movingLinks === 1 ? "" : "s"} moving,{" "}
                              <strong className="font-medium text-foreground" data-tabular>
                                {toReview}
                              </strong>{" "}
                              going to the review queue
                            </span>
                            <Button variant="ghost" size="sm" className="h-7" onClick={() => setRemap({})} disabled={movingLinks === 0}>
                              Send all to review
                            </Button>
                          </div>
                        )}
                        <ul className="space-y-2">
                          {preview.removed.slice(0, LIST_CAP).map((r) => {
                            const candidates = r.candidates ?? []
                            const destination = candidates.find((cd) => cd.id === remap[r.id])
                            return (
                              <li key={r.id} className="rounded-lg border border-border p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono text-sm font-semibold text-foreground">{r.id}</span>
                                  <Links n={r.links} />
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">{r.text}</p>

                                {r.links > 0 && candidates.length > 0 && (
                                  <div className="mt-3 border-t border-border pt-3">
                                    <label htmlFor={`to-${r.id}`} className="text-xs font-medium text-muted-foreground">
                                      Move its links to
                                    </label>
                                    <select
                                      id={`to-${r.id}`}
                                      value={remap[r.id] ?? ""}
                                      onChange={(e) =>
                                        setRemap((prev) => {
                                          const next = { ...prev }
                                          if (e.target.value) next[r.id] = e.target.value
                                          else delete next[r.id]
                                          return next
                                        })
                                      }
                                      className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                      {candidates.map((cd) => (
                                        <option key={cd.id} value={cd.id}>
                                          {cd.id}
                                        </option>
                                      ))}
                                      <option value="">Nothing — send to the review queue</option>
                                    </select>
                                    <p className="mt-1.5 text-xs text-muted-foreground">
                                      {destination ? destination.text : "Someone picks the item later, from the whole Schedule."}
                                    </p>
                                  </div>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      </>
                    ))}

                  {tab === "reworded" &&
                    (preview.reworded.length === 0 ? (
                      <Empty text="No wording changes." />
                    ) : (
                      <ul className="space-y-2">
                        {preview.reworded.slice(0, LIST_CAP).map((r) => (
                          <li key={r.id} className="rounded-lg border border-border p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-mono text-sm font-semibold text-foreground">{r.from === r.to ? r.to : `${r.from} → ${r.to}`}</span>
                              <span className="flex items-center gap-2">
                                {r.links > 0 && (
                                  <span
                                    className={cn(
                                      "rounded-full px-2 py-0.5 text-[11px] font-medium",
                                      r.needsReview ? "bg-warning/15 text-foreground" : "bg-muted text-muted-foreground",
                                    )}
                                  >
                                    {r.needsReview ? "Review" : "Minor"}
                                  </span>
                                )}
                                <Links n={r.links} />
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground line-through decoration-muted-foreground/40">{r.before}</p>
                            <p className="mt-1 text-sm text-foreground">{r.after}</p>
                          </li>
                        ))}
                      </ul>
                    ))}

                  {tab === "moved" &&
                    (preview.moved.length === 0 ? (
                      <Empty text="Nothing renumbered." />
                    ) : (
                      <ul className="divide-y divide-border rounded-lg border border-border">
                        {preview.moved.slice(0, LIST_CAP).map((m) => (
                          <li key={`${m.from}-${m.to}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                            <span className="font-mono text-foreground">
                              {m.from} <ArrowRight className="mx-1 inline h-3.5 w-3.5 align-[-2px] text-muted-foreground" aria-hidden="true" /> {m.to}
                            </span>
                            <Links n={m.links} />
                          </li>
                        ))}
                      </ul>
                    ))}

                  {tab === "added" &&
                    (preview.added.length === 0 ? (
                      <Empty text="No new items." />
                    ) : (
                      <ul className="divide-y divide-border rounded-lg border border-border">
                        {preview.added.slice(0, LIST_CAP).map((a) => (
                          <li key={a.id} className="px-3 py-2 text-sm">
                            <span className="font-mono font-semibold text-foreground">{a.id}</span>
                            <span className="ml-2 text-muted-foreground">{a.text}</span>
                          </li>
                        ))}
                      </ul>
                    ))}

                  {Math.max(c.removed, c.reworded, c.moved, c.added) > LIST_CAP && (
                    <p className="mt-2 text-xs text-muted-foreground">Showing the first {LIST_CAP}. The report has everything.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-row flex-wrap items-center gap-2 border-t border-border p-4 sm:justify-between">
          {!preview.firstLoad ? (
            <ReportMenu label="Preview report" load={async () => ({ report: preview, status: { kind: "preview" } })} />
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={applying}>
              Cancel
            </Button>
            <Button onClick={apply} disabled={applying} className="gap-2">
              {applying ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
              {preview.firstLoad ? "Load" : "Apply update"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const Empty = ({ text }: { text: string }) => <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>

const Links = ({ n }: { n: number }) =>
  n > 0 ? (
    <span className="whitespace-nowrap text-xs text-muted-foreground" data-tabular>
      {n} link{n === 1 ? "" : "s"}
    </span>
  ) : null

/** Load the library, preview and apply an update, or flag the review queue. */
export function LibraryPanel({
  library,
  isAdmin,
  onLoaded,
}: {
  library: LibraryStatus
  isAdmin: boolean
  onLoaded: (library?: LibraryStatus) => void
}) {
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)

  const needsAction = !library.loaded || library.updateAvailable
  if (!needsAction && library.openReviews === 0) return null

  async function openPreview() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/mos/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview" }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error)
      setPreview(data.preview)
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Couldn't load the preview")
    } finally {
      setLoading(false)
    }
  }

  if (!needsAction) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4">
        <GitCompareArrows className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        <p className="text-sm text-foreground">
          <strong data-tabular>{library.openReviews}</strong> link{library.openReviews === 1 ? "" : "s"} to review since the
          {library.lastRevision?.compilation ? ` ${library.lastRevision.compilation}` : ""} update.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Library className="h-5 w-5 text-primary" aria-hidden="true" />
          </span>
          <div>
            <p className="font-medium text-foreground">{library.loaded ? "MOS update ready" : "Schedule 3 isn't loaded"}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {library.loaded
                ? `${library.compilation ?? "Current"} → ${library.bundledCompilation ?? "new build"}`
                : isAdmin
                  ? `Compilation ${library.bundledCompilation ?? "unknown"}`
                  : "Ask an admin to load it."}
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button onClick={openPreview} disabled={loading} className="h-10 shrink-0 gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <GitCompareArrows className="h-4 w-4" aria-hidden="true" />}
            {library.loaded ? "Review changes" : "Load"}
          </Button>
        )}
      </div>

      {preview && <UpdateDialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)} preview={preview} onApplied={() => onLoaded()} />}
    </>
  )
}

interface RevisionRow {
  id: string
  fromCompilation: string | null
  compilation: string | null
  appliedAt: string
  appliedBy: string | null
  moved: number
  reworded: number
  added: number
  removed: number
  flaggedLinks: number
}

/** Applied updates, each with its change report. Admins only. */
export function UpdateHistory({ refreshKey }: { refreshKey?: unknown }) {
  const [rows, setRows] = useState<RevisionRow[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/admin/mos/revisions")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => !cancelled && setRows(d.revisions ?? []))
      .catch(() => !cancelled && setRows([]))
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  if (!rows?.length) return null

  const loadReport = (id: string) => async () => {
    const res = await fetch(`/api/admin/mos/revisions/${id}`)
    if (!res.ok) throw new Error("report")
    return res.json()
  }

  return (
    <section aria-labelledby="mos-history" className="space-y-3">
      <h2 id="mos-history" className="flex items-center gap-2 text-base font-semibold text-foreground">
        <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        Update history
      </h2>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-e1">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-mono text-sm font-medium text-foreground">
                {r.fromCompilation ? (
                  <>
                    {r.fromCompilation} <ArrowRight className="mx-1 inline h-3.5 w-3.5 align-[-2px] text-muted-foreground" aria-hidden="true" />{" "}
                  </>
                ) : null}
                {r.compilation ?? "Build"}
              </p>
              <p className="text-xs text-muted-foreground" data-tabular>
                {new Date(r.appliedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                {r.appliedBy && ` · ${r.appliedBy}`}
                {r.fromCompilation
                  ? ` · ${r.moved} renumbered, ${r.reworded} reworded, ${r.added} new, ${r.removed} removed · ${r.flaggedLinks} to review`
                  : " · First load"}
              </p>
            </div>
            <ReportMenu size="sm" label="Report" load={loadReport(r.id)} />
          </li>
        ))}
      </ul>
    </section>
  )
}
