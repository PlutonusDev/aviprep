import type React from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertTriangle } from "lucide-react"

/**
 * The building blocks every dashboard page is made of, so the dashboard,
 * history, statistics and insights pages can't drift apart.
 */

export function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl space-y-8 p-4 lg:p-8">{children}</div>
}

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string
  description?: React.ReactNode
  /** Primary action, right-aligned on wide screens. */
  children?: React.ReactNode
}) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="space-y-1.5">
        <h1 className="text-display-3 font-bold text-foreground">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {children}
    </header>
  )
}

/**
 * A headline number. Icons are all one muted ink on purpose: colour here would
 * encode nothing, and status colour is reserved for things that mean good/bad.
 * The value uses proportional figures - tabular-nums only belongs in columns.
 */
export function StatTile({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  detail?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 font-sans text-2xl font-semibold text-foreground">{value}</p>
      {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
    </div>
  )
}

export function SectionHeading({
  title,
  count,
  description,
  children,
}: {
  title: string
  count?: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {count && (
            <Badge variant="secondary" className="text-xs font-normal">
              {count}
            </Badge>
          )}
        </div>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <Card className="border-dashed shadow-none">
      <CardContent className="flex flex-col items-center px-6 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </span>
        <h2 className="mt-4 font-semibold text-foreground">{title}</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
        {children && <div className="mt-5">{children}</div>}
      </CardContent>
    </Card>
  )
}

export function LoadError({ title, message }: { title: string; message: string }) {
  return (
    <PageShell>
      <div role="alert">
        <EmptyState icon={AlertTriangle} title={title} description={message} />
      </div>
    </PageShell>
  )
}

export function PageSkeleton({ tiles = 4 }: { tiles?: number }) {
  return (
    <PageShell>
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: tiles }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </PageShell>
  )
}

/** Minutes as "45m" or "3h 20m". */
export function formatMinutes(mins: number): string {
  const m = Math.max(0, Math.round(mins))
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest ? `${h}h ${rest}m` : `${h}h`
}
