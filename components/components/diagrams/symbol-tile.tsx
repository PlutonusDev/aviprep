"use client"

import { primitiveSvg } from "@lib/diagrams/render"
import type { SymbolDef } from "@lib/diagrams/symbols"
import { cn } from "@lib/utils"

/**
 * One symbol in the palette, drawn from the same definition the canvas uses, so
 * the palette can never show something the diagram won't.
 */
export function SymbolTile({
  def,
  onPick,
  className,
}: {
  def: SymbolDef
  onPick: (id: string) => void
  className?: string
}) {
  const body = def.draw.map((p) => primitiveSvg(p, "currentColor")).join("")

  return (
    <button
      type="button"
      onClick={() => onPick(def.id)}
      title={def.hint ? `${def.label} — ${def.hint}` : def.label}
      className={cn(
        "group flex flex-col items-center gap-1 rounded-lg border border-transparent p-2 text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <svg viewBox="0 0 100 100" className="h-8 w-8 shrink-0" aria-hidden="true" dangerouslySetInnerHTML={{ __html: body }} />
      <span className="w-full truncate text-center text-[11px] leading-tight">{def.label}</span>
    </button>
  )
}
