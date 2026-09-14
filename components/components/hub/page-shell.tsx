import type React from "react"
import { cn } from "lib/utils"

/**
 * One page frame for every hub page. Pages previously each set their own
 * padding and rhythm and none capped its width, so content ran edge to edge on
 * wide monitors and no two pages lined up.
 */
export const PAGE_CONTAINER = "mx-auto w-full max-w-6xl space-y-8 p-4 lg:p-8"

export function PageContainer({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <div className={cn(PAGE_CONTAINER, className)}>{children}</div>
}

/**
 * Title, optional supporting line, optional actions on the right.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 space-y-1.5">
        <h1 className="text-display-3 font-bold text-foreground">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}
