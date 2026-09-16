import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@lib/utils"

/** Matches lib/attribution.ts Contributor. */
export interface Contributor {
  id: string
  name: string
  avatar: string | null
}

const NAMES_SHOWN = 2
const AVATARS_SHOWN = 3

/** "Jane Smith", "Jane Smith & Tom Lee", "Jane Smith, Tom Lee +3 more". */
export function contributorNames(names: string[], shown = NAMES_SHOWN) {
  if (names.length <= 1) return names[0] ?? ""
  if (names.length === 2 && shown >= 2) return `${names[0]} & ${names[1]}`
  const rest = names.length - shown
  return rest > 0 ? `${names.slice(0, shown).join(", ")} +${rest} more` : names.join(", ")
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?"

/**
 * Credit for a lesson or course: avatars and names, set in a corner. Several
 * contributors become an overlapping stack with the first couple of names.
 */
export function ContributorStack({ contributors, label = "Written by", className }: { contributors: Contributor[]; label?: string; className?: string }) {
  if (!contributors.length) return null
  const names = contributors.map((c) => c.name)
  const all = names.join(", ")
  const extra = contributors.length - AVATARS_SHOWN

  return (
    <div className={cn("flex items-center gap-2.5", className)} title={contributors.length > NAMES_SHOWN ? all : undefined}>
      <div className="flex shrink-0 -space-x-2" aria-hidden="true">
        {contributors.slice(0, AVATARS_SHOWN).map((c) => (
          <Avatar key={c.id} className="h-8 w-8 ring-2 ring-background">
            {c.avatar && <AvatarImage src={c.avatar} alt="" className="object-cover" />}
            <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-foreground">{initials(c.name)}</AvatarFallback>
          </Avatar>
        ))}
        {extra > 0 && (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground ring-2 ring-background">
            +{extra}
          </span>
        )}
      </div>
      <p className="min-w-0 text-xs leading-tight">
        <span className="block text-muted-foreground">{label}</span>
        <span className="block truncate font-medium text-foreground">{contributorNames(names)}</span>
        {contributors.length > NAMES_SHOWN && <span className="sr-only">Everyone: {all}</span>}
      </p>
    </div>
  )
}

/** Credit on an exam question: names only, quiet, so it never competes with the question. */
export function ContributorNames({ contributors, className }: { contributors: Contributor[]; className?: string }) {
  if (!contributors.length) return null
  const names = contributors.map((c) => c.name)
  return (
    <p className={cn("text-xs text-muted-foreground", className)} title={names.length > NAMES_SHOWN ? names.join(", ") : undefined}>
      <span className="sr-only">Written by </span>
      {contributorNames(names)}
    </p>
  )
}
