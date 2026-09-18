"use client"

import { useId } from "react"
import { cn } from "@lib/utils"
import { parseNumericAnswer } from "@lib/exam/marking"

/**
 * A typed answer: one number, with its unit printed beside the box.
 *
 * The unit isn't typed, so nobody loses a mark for writing "knots" instead of
 * "kt". The tolerance is deliberately not shown: how tightly an answer has to
 * land is a hint about how carefully to work, and the real exam doesn't give
 * that away either. It's explained afterwards, on the marked paper.
 */
export function NumericAnswer({
  value,
  onChange,
  unit,
  labelledBy,
  className,
}: {
  value: string
  onChange: (value: string) => void
  unit?: string | null
  labelledBy?: string
  className?: string
}) {
  const id = useId()
  const typed = value.trim().length > 0
  const parsed = parseNumericAnswer(value)
  const unreadable = typed && parsed === null

  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        Your answer
      </label>

      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border bg-card px-4 py-3 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30",
          unreadable ? "border-warning" : typed ? "border-primary" : "border-border",
        )}
      >
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          // "decimal" keeps a minus sign and a decimal point on a phone keypad,
          // which "numeric" does not.
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="next"
          aria-labelledby={labelledBy}
          // The unit beside the box is the only thing describing the field, so
          // it's part of the accessible description rather than decoration.
          aria-describedby={cn(unit?.trim() && `${id}-unit`, unreadable && `${id}-error`) || undefined}
          aria-invalid={unreadable || undefined}
          placeholder="Your answer"
          className="min-w-0 flex-1 bg-transparent text-xl font-medium text-foreground outline-none placeholder:text-base placeholder:font-normal placeholder:text-muted-foreground"
          data-tabular
        />
        {unit?.trim() && (
          <span id={`${id}-unit`} className="shrink-0 text-lg font-medium text-muted-foreground">
            {unit.trim()}
          </span>
        )}
      </div>

      {unreadable && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-warning">
          That isn&apos;t a number we can mark. Enter digits, e.g. 1250 or 12.5.
        </p>
      )}
    </div>
  )
}
