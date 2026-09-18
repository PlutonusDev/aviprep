"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, ExternalLink, Target } from "lucide-react"
import { cn } from "@lib/utils"
import type { MosLink } from "@lib/mos/subjects"

/**
 * The MOS item a question is being written for, kept in view while they write.
 *
 * The whole point of a question is the standard it proves, and that standard is
 * two or three lines of prose nobody remembers verbatim. It follows the scroll:
 * beside the editor on a wide screen, pinned under the header on a narrow one.
 */
export function MosFocusCard({
  links,
  subjectId,
  className,
}: {
  links?: MosLink[]
  subjectId?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)

  const primary = links?.find((l) => l.primary && l.item)
  const others = links?.filter((l) => !l.primary && l.item) ?? []

  if (!primary?.item) {
    return (
      <aside
        className={cn(
          "rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm",
          className,
        )}
      >
        <p className="flex items-center gap-2 font-medium text-foreground">
          <Target className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          No MOS item yet
        </p>
        <p className="mt-1.5 text-muted-foreground">Needed before it can go live.</p>
        {subjectId && (
          <Link
            href={`/admin/mos/${subjectId}`}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Pick one
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </aside>
    )
  }

  const item = primary.item

  return (
    <aside
      aria-label="The MOS item this question is written for"
      className={cn(
        "overflow-hidden rounded-xl border border-primary/30 bg-primary/[0.04] shadow-e1 backdrop-blur supports-[backdrop-filter]:bg-primary/[0.06]",
        className,
      )}
    >
      <div className="px-4 py-3">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <Target className="h-3.5 w-3.5" aria-hidden="true" />
          Writing for
        </p>

        <p className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="rounded border border-primary/30 bg-background px-1.5 py-px text-[11px] font-semibold text-primary" data-tabular>
            {item.unitCode}
          </span>
          <span className="text-[11px] text-muted-foreground" data-tabular>
            {item.ref}
          </span>
          {item.retired && (
            <span className="rounded bg-destructive/10 px-1.5 py-px text-[11px] font-medium text-destructive">Retired</span>
          )}
        </p>

        <p className="mt-2 text-sm font-semibold leading-snug text-foreground">{item.subtopicTitle || item.topicTitle}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">{item.fullText}</p>

        {item.subtopicTitle && item.topicTitle && item.subtopicTitle !== item.topicTitle && (
          <p className="mt-2 truncate text-xs text-muted-foreground" title={item.topicTitle}>
            Under {item.topicTitle}
          </p>
        )}
      </div>

      {others.length > 0 && (
        <div className="border-t border-primary/20">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            Also mapped to {others.length} {others.length === 1 ? "item" : "items"}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
          </button>
          {open && (
            <ul className="space-y-2 px-4 pb-3 text-xs text-muted-foreground">
              {others.map((link) => (
                <li key={link.itemId}>
                  <span className="font-medium text-foreground" data-tabular>
                    {link.item!.ref}
                  </span>{" "}
                  {link.item!.subtopicTitle || link.item!.topicTitle}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </aside>
  )
}
