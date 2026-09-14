"use client"

import Link from "next/link"
import { ChevronLeft, ChevronRight, Lock } from "lucide-react"
import { formatDistanceToNowStrict } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { EmptyState, PageShell } from "@/components/hub/page-primitives"
import { useTenant } from "@lib/tenant-context"
import { cn } from "@lib/utils"

export interface Crumb {
  label: string
  href?: string
}

export function ForumBreadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {items.map((item, i) => {
          const last = i === items.length - 1
          return (
            <li key={i} className="flex min-w-0 items-center gap-1">
              {item.href && !last ? (
                <Link href={item.href} className="rounded hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {item.label}
                </Link>
              ) : (
                <span className={cn("truncate", last && "text-foreground")} aria-current={last ? "page" : undefined}>
                  {item.label}
                </span>
              )}
              {!last && <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function UserAvatar({
  firstName,
  lastName,
  src,
  className,
}: {
  firstName?: string | null
  lastName?: string | null
  src?: string | null
  className?: string
}) {
  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?"
  return (
    <Avatar className={cn("h-9 w-9", className)}>
      <AvatarImage src={src || undefined} alt="" />
      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials}</AvatarFallback>
    </Avatar>
  )
}

export function fullName(user?: { firstName?: string | null; lastName?: string | null } | null) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Former member"
}

/** "3h ago", "just now". Strict, so it never says "about". */
export function timeAgo(date: string | Date) {
  const d = new Date(date)
  if (Date.now() - d.getTime() < 60_000) return "just now"
  return formatDistanceToNowStrict(d, { addSuffix: true })
}

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label="Pages" className="flex items-center justify-center gap-3">
      <Button variant="outline" size="sm" className="h-9 gap-1" onClick={() => onChange(page - 1)} disabled={page <= 1}>
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Previous
      </Button>
      <span className="text-sm text-muted-foreground" data-tabular>
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-1"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
      >
        Next
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </nav>
  )
}

/** Shown when the API says the forums are locked for this account. */
export function ForumLocked() {
  const { isWhitelabeled } = useTenant()
  return (
    <PageShell>
      <EmptyState
        icon={Lock}
        title="Forums are locked"
        description={
          isWhitelabeled
            ? "They open once your school assigns you a subject."
            : "Get access to any subject to join the conversation."
        }
      >
        {!isWhitelabeled && (
          <Button asChild className="h-10">
            <Link href="/dashboard/pricing">Get access</Link>
          </Button>
        )}
      </EmptyState>
    </PageShell>
  )
}
