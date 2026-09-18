"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ChevronRight, FileQuestion, Gauge, ListChecks, ShieldCheck } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, PageHeader, PageShell, StatTile } from "@/components/hub/page-primitives"
import { CoverageBar, CoverageLegend, LibraryPanel } from "@/components/admin/mos-ui"
import { UpdateHistory } from "@/components/admin/mos-update"
import { cn } from "@lib/utils"
import { MIN_QUESTIONS_PER_ITEM, MOS_LICENCES } from "@lib/mos/subjects"
import type { SubjectCoverage } from "@lib/mos/coverage"
import type { LibraryStatus } from "@lib/mos/library"

type Sort = "schedule" | "lowest"

export function MosOverview() {
  const [subjects, setSubjects] = useState<SubjectCoverage[] | null>(null)
  const [library, setLibrary] = useState<LibraryStatus | null>(null)
  const [role, setRole] = useState<"admin" | "curator">("curator")
  const [error, setError] = useState(false)
  const [licence, setLicence] = useState<string>("all")
  const [sort, setSort] = useState<Sort>("schedule")

  const load = useCallback(async () => {
    setError(false)
    try {
      const res = await fetch("/api/admin/mos/coverage")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSubjects(data.subjects)
      setLibrary(data.library)
      setRole(data.role === "admin" ? "admin" : "curator")
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const totals = useMemo(() => {
    const live = (subjects ?? []).filter((s) => !s.comingSoon)
    const sum = (f: (s: SubjectCoverage) => number) => live.reduce((n, s) => n + f(s), 0)
    const assessable = sum((s) => s.assessable)
    const mapped = sum((s) => s.mapped)
    return {
      percent: assessable ? Math.floor((mapped / assessable) * 100) : 0,
      mapped,
      assessable,
      notMapped: assessable - mapped,
      low: sum((s) => s.lowDensity),
      unmappedContent: sum((s) => s.unmappedQuestions + s.unmappedLessons),
      unmappedQuestions: sum((s) => s.unmappedQuestions),
      unmappedLessons: sum((s) => s.unmappedLessons),
    }
  }, [subjects])

  const visible = useMemo(() => {
    const list = (subjects ?? []).filter((s) => licence === "all" || s.licence === licence)
    if (sort === "lowest") return [...list].sort((a, b) => Number(a.comingSoon) - Number(b.comingSoon) || a.percent - b.percent)
    return list
  }, [subjects, licence, sort])

  if (error) {
    return (
      <PageShell>
        <div role="alert">
          <EmptyState icon={AlertTriangle} title="Couldn't load coverage" description="Refresh to try again." />
        </div>
      </PageShell>
    )
  }

  if (!subjects || !library) {
    return (
      <PageShell>
        <div className="space-y-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[88px] rounded-lg" />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </PageShell>
    )
  }

  const isAdmin = role === "admin"

  return (
    <PageShell>
      <PageHeader
        title="MOS coverage"
        description="Where writing starts. Open a subject to see which Part 61 standards still need questions."
      >
        {library.loaded && (
          <span className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Compilation <span className="font-mono font-medium text-foreground">{library.compilation ?? "unknown"}</span>
            <span aria-hidden="true">·</span>
            <span data-tabular>{library.items.toLocaleString()} items</span>
          </span>
        )}
      </PageHeader>

      <LibraryPanel library={library} isAdmin={isAdmin} onLoaded={() => load()} />

      {library.loaded && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile icon={Gauge} label="Mapped" value={`${totals.percent}%`} detail={`${totals.mapped.toLocaleString()} of ${totals.assessable.toLocaleString()} items`} />
            <StatTile icon={ListChecks} label="Not mapped" value={totals.notMapped.toLocaleString()} />
            <StatTile icon={AlertTriangle} label="Low on questions" value={totals.low.toLocaleString()} detail={`Fewer than ${MIN_QUESTIONS_PER_ITEM}`} />
            <StatTile
              icon={FileQuestion}
              label="Unlinked content"
              value={totals.unmappedContent.toLocaleString()}
              detail={`${totals.unmappedQuestions.toLocaleString()} questions · ${totals.unmappedLessons.toLocaleString()} lessons`}
            />
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div role="group" aria-label="Filter by licence" className="flex flex-wrap gap-1.5">
              {[{ id: "all", label: "All" }, ...MOS_LICENCES].map((l) => {
                const count = l.id === "all" ? subjects.length : subjects.filter((s) => s.licence === l.id).length
                if (!count) return null
                const active = licence === l.id
                return (
                  <button
                    key={l.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setLicence(l.id)}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted",
                    )}
                  >
                    {l.label}
                    <span className={cn("text-xs", active ? "text-primary-foreground/80" : "text-muted-foreground")} data-tabular>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <CoverageLegend />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Sort
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="schedule">Licence order</option>
                  <option value="lowest">Lowest coverage first</option>
                </select>
              </label>
            </div>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((s) => {
              const notMapped = s.assessable - s.mapped
              const unlinked = s.unmappedQuestions + s.unmappedLessons
              return (
                <li key={s.subjectId} className="min-w-0">
                  <Link
                    href={`/admin/mos/${s.subjectId}`}
                    className="group flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-e1 transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-e2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-foreground">{s.code}</span>
                          <span className="text-xs uppercase text-muted-foreground">{s.licence}</span>
                          {s.comingSoon && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Coming soon</span>
                          )}
                        </p>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">{s.name}</p>
                      </div>
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </div>

                    <p className="mt-4 flex items-baseline gap-2">
                      <span className="text-3xl font-semibold text-foreground">{s.percent}%</span>
                      <span className="text-sm text-muted-foreground">mapped</span>
                    </p>
                    <CoverageBar covered={s.mapped - s.lowDensity} low={s.lowDensity} draft={s.draftOnly} total={s.assessable} className="mt-2" />

                    <p className="mt-3 text-sm text-foreground" data-tabular>
                      {notMapped === 0 ? (
                        "Every item mapped"
                      ) : (
                        <>
                          {notMapped} item{notMapped === 1 ? "" : "s"} missing
                        </>
                      )}
                      {s.lowDensity > 0 && <span className="text-muted-foreground"> · {s.lowDensity} low on questions</span>}
                    </p>
                    {unlinked > 0 && (
                      <p className="mt-1 text-xs font-medium text-warning" data-tabular>
                        {[
                          s.unmappedQuestions && `${s.unmappedQuestions} question${s.unmappedQuestions === 1 ? "" : "s"}`,
                          s.unmappedLessons && `${s.unmappedLessons} lesson${s.unmappedLessons === 1 ? "" : "s"}`,
                        ]
                          .filter(Boolean)
                          .join(", ")}{" "}
                        unlinked
                      </p>
                    )}
                    {s.openReviews > 0 && (
                      <p className="mt-1 text-xs font-medium text-foreground" data-tabular>
                        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-warning align-middle" aria-hidden="true" />
                        {s.openReviews} link{s.openReviews === 1 ? "" : "s"} to review
                      </p>
                    )}
                    <p className="mt-auto pt-3 text-xs text-muted-foreground">
                      {s.units.filter((u) => !u.reserved).map((u) => u.code).join(" + ") || "No units"}
                    </p>
                  </Link>
                </li>
              )
            })}
          </ul>
        </>
      )}
      {isAdmin && <UpdateHistory refreshKey={library.loadedAt} />}
    </PageShell>
  )
}
