"use client"

import { useRef, useState } from "react"
import { ImagePlus, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@lib/utils"
import { TOLERANCE_PRESETS, formatTolerance } from "@lib/exam/marking"
import { MAX_UNIT } from "@lib/question-validation"

/**
 * The parts of the editor that change with how a question is answered: the
 * stem image, and the value a typed answer is marked against.
 */

/* --- The chart or diagram --------------------------------------------------- */

export function StemImage({
  url,
  alt,
  onChange,
  error,
}: {
  url?: string | null
  alt?: string | null
  onChange: (patch: { imageUrl?: string | null; imageAlt?: string | null }) => void
  error?: string
}) {
  const input = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)

  async function upload(file: File) {
    setBusy(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/admin/questions/image", { method: "POST", body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "That didn't upload.")
        return
      }
      onChange({ imageUrl: data.url })
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ""
    }
  }

  if (!url) {
    return (
      <div className="mt-3">
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) upload(file)
          }}
          id="q-image"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="h-8 gap-1.5 text-muted-foreground"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />}
          Add a chart or diagram
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="relative overflow-hidden rounded-xl border border-border bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={alt || ""} className="mx-auto block max-h-64 w-auto max-w-full object-contain" />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange({ imageUrl: null, imageAlt: null })}
          className="absolute right-2 top-2 h-8 gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Remove
        </Button>
      </div>

      {/* Required, not optional: a student on a screen reader has nothing else. */}
      <div
        className={cn(
          "rounded-lg border bg-muted/40 px-3 pb-1.5 pt-2 transition-colors focus-within:border-primary focus-within:bg-background",
          error ? "border-destructive" : "border-transparent",
        )}
      >
        <Label htmlFor="q-image-alt" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          What the image shows
        </Label>
        <Input
          id="q-image-alt"
          value={alt ?? ""}
          onChange={(e) => onChange({ imageAlt: e.target.value })}
          maxLength={300}
          aria-invalid={error ? true : undefined}
          placeholder="e.g. Take-off performance chart, 2,400 kg, 30°C"
          className="h-auto border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
        />
        <p className={cn("mt-1 text-xs", error ? "text-destructive" : "text-muted-foreground")}>
          {error ?? "Read out instead of the image. Don't give the answer away."}
        </p>
      </div>
    </div>
  )
}

/* --- A typed answer --------------------------------------------------------- */

export function NumericAnswerFields({
  answerValue,
  answerUnit,
  tolerance,
  toleranceType,
  onChange,
  errors,
}: {
  answerValue?: number | null
  answerUnit?: string | null
  tolerance?: number | null
  toleranceType?: string | null
  onChange: (patch: {
    answerValue?: number | null
    answerUnit?: string | null
    tolerance?: number | null
    toleranceType?: string | null
  }) => void
  errors: Record<string, string | undefined>
}) {
  const absolute = toleranceType === "absolute"
  const current = tolerance ?? 0

  const number = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) return null
    const n = Number(trimmed)
    return Number.isFinite(n) ? n : null
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <Field label="Correct value" htmlFor="q-answer-value" error={errors.answerValue}>
          <Input
            id="q-answer-value"
            inputMode="decimal"
            defaultValue={answerValue ?? ""}
            key={`value-${answerValue ?? ""}`}
            onChange={(e) => onChange({ answerValue: number(e.target.value) })}
            aria-invalid={errors.answerValue ? true : undefined}
            placeholder="e.g. 1250"
            className="h-auto border-0 bg-transparent px-0 py-0 text-lg font-semibold shadow-none focus-visible:ring-0"
            data-tabular
          />
        </Field>

        <Field label="Unit" htmlFor="q-answer-unit" error={errors.answerUnit} hint="Shown beside the box">
          <Input
            id="q-answer-unit"
            value={answerUnit ?? ""}
            onChange={(e) => onChange({ answerUnit: e.target.value })}
            maxLength={MAX_UNIT}
            placeholder="kt"
            className="h-auto border-0 bg-transparent px-0 py-0 text-lg font-semibold shadow-none focus-visible:ring-0"
          />
        </Field>
      </div>

      <div className="rounded-lg border border-border bg-muted/40 px-3.5 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">How close counts</p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {TOLERANCE_PRESETS.map((preset) => {
            const active = !absolute && current === preset
            return (
              <button
                key={preset}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange({ tolerance: preset, toleranceType: "percent" })}
                className={cn(
                  "h-8 rounded-full border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "border-primary bg-primary/10 font-medium text-foreground" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {preset === 0 ? "Exact" : `±${preset}%`}
              </button>
            )
          })}

          <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />

          <label
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-full border pl-3 pr-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
              absolute ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground",
            )}
          >
            <span>±</span>
            <input
              inputMode="decimal"
              value={absolute ? (tolerance ?? "") : ""}
              onFocus={() => !absolute && onChange({ toleranceType: "absolute", tolerance: tolerance ?? 0 })}
              onChange={(e) => onChange({ tolerance: number(e.target.value) ?? 0, toleranceType: "absolute" })}
              placeholder="amount"
              aria-label="Tolerance as an exact amount"
              className="w-20 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              data-tabular
            />
            {answerUnit?.trim() && <span className="text-muted-foreground">{answerUnit.trim()}</span>}
          </label>
        </div>

        {errors.tolerance ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {errors.tolerance}
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            {typeof answerValue === "number"
              ? `Students marked right on anything from ${round(answerValue - amount(answerValue, current, absolute))} to ${round(answerValue + amount(answerValue, current, absolute))}${answerUnit?.trim() ? ` ${answerUnit.trim()}` : ""}.`
              : formatTolerance({ tolerance, toleranceType, answerUnit, answerValue })}
          </p>
        )}
      </div>
    </div>
  )
}

const amount = (value: number, tolerance: number, absolute: boolean) =>
  absolute ? Math.abs(tolerance) : (Math.abs(value) * Math.abs(tolerance)) / 100

const round = (n: number) => Number(n.toFixed(4)).toLocaleString("en-AU", { maximumFractionDigits: 4 })

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-muted/40 px-3.5 pb-2 pt-2 transition-colors focus-within:border-primary focus-within:bg-background",
        error ? "border-destructive" : "border-transparent",
      )}
    >
      <Label htmlFor={htmlFor} className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
      {error ? (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}
