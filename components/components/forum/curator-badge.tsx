import { PenLine } from "lucide-react"
import { cn } from "@lib/utils"

/**
 * Marks someone who writes AviPrep's material, and what they fly.
 *
 * Worth saying plainly in a forum: an answer from the person who wrote the
 * explanation, or from a Grade 1 Instructor, carries weight a username doesn't.
 * The credential sits beside the badge rather than inside it, so it reads as
 * their standing rather than as part of the label.
 */
export function CuratorBadge({
  isCurator,
  credential,
  className,
}: {
  isCurator?: boolean | null
  credential?: string | null
  className?: string
}) {
  if (!isCurator) return null

  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1", className)}>
      <span
        title="Writes AviPrep's questions and lessons"
        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-px text-[11px] font-semibold text-primary"
      >
        <PenLine className="h-2.5 w-2.5" aria-hidden="true" />
        Curator
      </span>
      {credential && (
        <span className="rounded-full border border-border px-1.5 py-px text-[11px] font-medium text-muted-foreground">
          {credential}
        </span>
      )}
    </span>
  )
}
