"use client"

import { cn } from "@lib/utils"
import { MOS_STATUS_LABELS, type MosStatus } from "@lib/mos/subjects"

/** Status colour is the only place colour carries meaning on these pages. */
export const STATUS_TONES: Record<MosStatus, { bar: string; badge: string; dot: string }> = {
  covered: { bar: "bg-success", badge: "border-success/30 bg-success/10", dot: "bg-success" },
  low: { bar: "bg-warning", badge: "border-warning/40 bg-warning/10", dot: "bg-warning" },
  draft: { bar: "bg-muted-foreground/35", badge: "border-border bg-muted", dot: "bg-muted-foreground/50" },
  missing: { bar: "bg-transparent", badge: "border-destructive/30 bg-destructive/10", dot: "bg-destructive" },
  excluded: { bar: "bg-transparent", badge: "border-border bg-transparent text-muted-foreground", dot: "bg-border" },
}

export function StatusBadge({ status }: { status: MosStatus }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium text-foreground",
        STATUS_TONES[status].badge,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_TONES[status].dot)} aria-hidden="true" />
      {MOS_STATUS_LABELS[status]}
    </span>
  )
}

/** Covered, low density and drafts, stacked, against assessable items. */
export function CoverageBar({
  covered,
  low,
  draft,
  total,
  className,
}: {
  covered: number
  low: number
  draft: number
  total: number
  className?: string
}) {
  const pct = (n: number) => (total ? (n / total) * 100 : 0)
  return (
    <div
      className={cn("flex h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      role="img"
      aria-label={`${covered + low} of ${total} mapped, ${low} low on questions, ${draft} in draft`}
    >
      <span className={STATUS_TONES.covered.bar} style={{ width: `${pct(covered)}%` }} />
      <span className={STATUS_TONES.low.bar} style={{ width: `${pct(low)}%` }} />
      <span className={STATUS_TONES.draft.bar} style={{ width: `${pct(draft)}%` }} />
    </div>
  )
}

export function CoverageLegend() {
  const entries: { status: MosStatus; label: string }[] = [
    { status: "covered", label: "Covered" },
    { status: "low", label: "Partly covered" },
    { status: "draft", label: "Drafts only" },
  ]
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {entries.map((e) => (
        <li key={e.status} className="flex items-center gap-1.5">
          <span className={cn("h-2 w-3 rounded-sm", STATUS_TONES[e.status].bar)} aria-hidden="true" />
          {e.label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="h-2 w-3 rounded-sm bg-muted" aria-hidden="true" />
        Not mapped
      </li>
    </ul>
  )
}

export { LibraryPanel } from "@/components/admin/mos-update"
