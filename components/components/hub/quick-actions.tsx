"use client"

import Link from "next/link"
import type React from "react"
import { useTenant } from "@lib/tenant-context"
import type { TenantFeature } from "@lib/tenant-features"

export interface QuickAction {
  href: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  hint: string
  /** Hidden when a school has switched this feature off. */
  feature?: TenantFeature
}

/**
 * The row of "jump straight in" links used on the dashboard and the practice
 * exams page. One component so the two stay identical.
 *
 * Every icon sits in the same primary tint: the colour marks "this is an action",
 * it does not distinguish one action from another, so varying it would encode
 * nothing. The whole tile is the link, so the hit area matches what looks
 * clickable.
 */
export function QuickActions({
  actions,
  label = "Quick actions",
}: {
  actions: QuickAction[]
  label?: string
}) {
  const { isFeatureEnabled } = useTenant()
  const visible = actions.filter((a) => !a.feature || isFeatureEnabled(a.feature))

  if (visible.length === 0) return null

  return (
    <section aria-label={label}>
      <ul className="grid gap-3 sm:grid-cols-3">
        {visible.map((action) => (
          <li key={action.href}>
            <Link
              href={action.href}
              className="group flex h-full items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <action.icon className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block font-medium text-foreground">{action.title}</span>
                <span className="block text-xs text-muted-foreground">{action.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
