"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ArrowDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@lib/utils"
import type { Block, Field, FieldErrors, Values } from "@lib/agreements/templates"
import type { DocumentTemplate } from "@lib/agreements/templates"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

/**
 * The document itself, on screen, filled in place.
 *
 * It's laid out from the same blocks the PDF is built from and wears the same
 * letterhead, so nothing is a surprise at the end: what they're typing into is
 * what they'll be downloading. The fields are the document's own boxes rather
 * than a form beside it.
 *
 * The document scrolls inside its own pane, with the signature below it. That
 * keeps the page short, and it means we can tell whether they reached the end
 * before signing - which is the difference between offering someone an
 * agreement and putting one in front of them.
 */

/** Close enough to the bottom. Sub-pixel scroll heights never land exactly. */
const BOTTOM_SLACK = 24

/** The printed letterhead, drawn rather than scanned so it stays crisp. */
function Letterhead() {
  return (
    <div className="relative">
      <div aria-hidden="true" className="flex h-[3px]">
        <span className="w-[24%] bg-primary" />
        <span className="flex-1 bg-[#1B5F99]" />
      </div>
      <div className="flex items-start justify-between gap-4 px-6 pb-3 pt-5 sm:px-10">
        <Image src="/img/AviPrep-logo.png" alt="AviPrep" width={132} height={44} className="h-9 w-auto sm:h-11" priority />
        <div className="text-right leading-tight">
          <p className="text-sm font-semibold text-foreground">aviprep.com.au</p>
          <p className="text-xs text-muted-foreground">hello@aviprep.com.au</p>
          <p className="text-xs text-muted-foreground" data-tabular>
            ABN 80 167 432 520
          </p>
        </div>
      </div>
      <div aria-hidden="true" className="flex items-center gap-2 px-6 pb-5 sm:px-10">
        <span className="h-[2px] w-16 rounded-full bg-primary" />
        <span className="h-[2px] w-1.5 rounded-full bg-primary" />
        <span className="h-px flex-1 bg-border" />
        <span className="h-2 w-2 rounded-full border-[1.5px] border-[#1B5F99]" />
        <span className="h-px w-6 bg-border" />
      </div>
    </div>
  )
}

function FieldBox({
  field,
  value,
  error,
  onChange,
}: {
  field: Field
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  const id = `doc-${field.id}`
  const describedBy = [error ? `${id}-error` : null, field.hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined

  if (field.type === "choice") {
    return (
      <fieldset className={cn("rounded-lg border p-3", error ? "border-destructive" : "border-border")}>
        <legend className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {field.label}
          {field.required && <span className="text-primary"> *</span>}
        </legend>
        <div className="space-y-1.5">
          {field.options?.map((option) => {
            const checked = value === option.value
            return (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  checked ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                <input
                  type="radio"
                  name={id}
                  value={option.value}
                  checked={checked}
                  onChange={() => onChange(option.value)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{option.label}</span>
                  {option.hint && <span className="mt-0.5 block text-xs text-muted-foreground">{option.hint}</span>}
                </span>
              </label>
            )
          })}
        </div>
        {error && (
          <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </fieldset>
    )
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-muted/40 px-3.5 pb-2 pt-2 transition-colors focus-within:border-primary focus-within:bg-background",
        error ? "border-destructive" : "border-transparent",
      )}
    >
      <label htmlFor={id} className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {field.label}
        {field.required && <span className="text-primary"> *</span>}
      </label>
      {field.type === "textarea" ? (
        <Textarea
          id={id}
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className="mt-0.5 min-h-0 resize-none border-0 bg-transparent px-0 py-0 text-base font-semibold text-foreground shadow-none focus-visible:ring-0 md:text-base"
        />
      ) : (
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          inputMode={field.type === "abn" ? "numeric" : field.type === "phone" ? "tel" : undefined}
          autoComplete={
            field.type === "email" ? "email" : field.type === "phone" ? "tel" : field.id === "legalName" ? "name" : "off"
          }
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className="mt-0.5 h-auto border-0 bg-transparent px-0 py-0 text-base font-semibold text-foreground shadow-none focus-visible:ring-0"
        />
      )}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-destructive">
          {error}
        </p>
      ) : (
        field.hint && (
          <p id={`${id}-hint`} className="mt-1 text-xs text-muted-foreground">
            {field.hint}
          </p>
        )
      )}
    </div>
  )
}

export function DocumentSheet({
  template,
  values,
  errors,
  onChange,
  onReadToEnd,
  children,
}: {
  template: DocumentTemplate
  values: Values
  errors: FieldErrors
  onChange: (id: string, value: string) => void
  /** Called once they've reached the bottom of the document. */
  onReadToEnd?: () => void
  /** The declaration, signature and sign button, under the document. */
  children?: React.ReactNode
}) {
  const paneRef = useRef<HTMLDivElement | null>(null)
  const [read, setRead] = useState(false)
  const [progress, setProgress] = useState(0)

  const check = useCallback(() => {
    const pane = paneRef.current
    if (!pane) return
    const scrollable = pane.scrollHeight - pane.clientHeight
    // Short enough to fit without scrolling: there's nothing left to reach.
    const seen = scrollable <= BOTTOM_SLACK || pane.scrollTop >= scrollable - BOTTOM_SLACK
    setProgress(scrollable <= 0 ? 1 : Math.min(1, pane.scrollTop / scrollable))
    if (seen) setRead(true)
  }, [])

  // Filling a field can grow the document, so the end moves. Watch the pane
  // rather than measuring once on mount.
  useEffect(() => {
    const pane = paneRef.current
    if (!pane || typeof ResizeObserver === "undefined") return check()
    const observer = new ResizeObserver(check)
    observer.observe(pane)
    if (pane.firstElementChild) observer.observe(pane.firstElementChild)
    return () => observer.disconnect()
  }, [check])

  useEffect(() => {
    if (read) onReadToEnd?.()
  }, [read, onReadToEnd])

  const jumpToEnd = () => {
    const pane = paneRef.current
    if (!pane) return
    pane.scrollTo({ top: pane.scrollHeight, behavior: "smooth" })
    // Smooth scrolling fires no final event on some browsers, and reduced
    // motion skips it entirely; mark it read rather than leave them stuck.
    setRead(true)
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-e2">
      <Letterhead />

      <div className="px-6 sm:px-10">
        <header className="border-b border-border pb-4">
          <h2 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">{template.title}</h2>
          <p className="mt-1.5 text-muted-foreground">{template.subtitle}</p>
          <div aria-hidden="true" className="mt-3 h-1 w-14 rounded-full bg-primary" />
        </header>
      </div>

      <div className="relative">
        {/* tabIndex makes the pane focusable, so it scrolls with the keyboard
            as well as a wheel or a finger. */}
        <div
          ref={paneRef}
          onScroll={check}
          tabIndex={0}
          role="region"
          aria-label={`${template.title}, scroll to read`}
          className="max-h-[min(60vh,40rem)] overflow-y-auto overscroll-contain px-6 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-10"
        >
          <div className="space-y-5">
            {template.blocks.map((block, i) => (
              <BlockView key={i} block={block} values={values} errors={errors} onChange={onChange} />
            ))}
            <p className="pt-2 text-center text-xs text-muted-foreground">End of {template.shortTitle ?? template.title}</p>
          </div>
        </div>

        {/* Says there's more below without covering the words. */}
        {!read && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent" />
        )}
      </div>

      <div className="border-t border-border">
        <div
          className={cn(
            "flex flex-wrap items-center gap-x-3 gap-y-2 px-6 py-3 transition-colors sm:px-10",
            read ? "bg-success/[0.06]" : "bg-muted/50",
          )}
        >
          {read ? (
            <>
              <Check className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              <p className="text-sm text-foreground">You&apos;ve reached the end.</p>
            </>
          ) : (
            <>
              <ArrowDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-foreground">
                Read to the end before you sign.
                <span className="ml-2 text-muted-foreground" data-tabular>
                  {Math.round(progress * 100)}%
                </span>
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={jumpToEnd} className="ml-auto h-8">
                Jump to the end
              </Button>
            </>
          )}
        </div>

        <div aria-hidden="true" className="h-0.5 bg-muted">
          <div
            className={cn("h-full transition-[width] duration-200 motion-reduce:transition-none", read ? "bg-success" : "bg-primary")}
            style={{ width: `${read ? 100 : Math.round(progress * 100)}%` }}
          />
        </div>
      </div>

      <div className="px-6 py-6 sm:px-10">{children}</div>
    </article>
  )
}

function BlockView({
  block,
  values,
  errors,
  onChange,
}: {
  block: Block
  values: Values
  errors: FieldErrors
  onChange: (id: string, value: string) => void
}) {
  if (block.kind === "heading") {
    return <h3 className="pt-2 text-xs font-semibold uppercase tracking-wider text-[#B45F00]">{block.text}</h3>
  }

  if (block.kind === "text") {
    return <p className="text-[15px] leading-relaxed text-foreground/90">{block.text}</p>
  }

  if (block.kind === "list") {
    const plain = block.marker === "plain"
    return (
      <ul className={cn("space-y-2", plain && "pl-1")}>
        {block.items.map((item) => (
          <li key={item} className="flex gap-3 text-[15px] leading-relaxed text-foreground/90">
            {!plain && <span aria-hidden="true" className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    )
  }

  // A numbered clause: the reference hangs in the margin so someone hunting
  // for "3.4" runs their eye down the left edge instead of reading every line.
  if (block.kind === "clause") {
    return (
      <div className="grid gap-x-3 sm:grid-cols-[3rem_minmax(0,1fr)]">
        <p className="text-[15px] font-semibold text-[#B45F00]" data-tabular>
          {block.ref}
        </p>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-foreground">{block.title}</p>
          <p className="mt-0.5 text-[15px] leading-relaxed text-foreground/90">{block.text}</p>
        </div>
      </div>
    )
  }

  if (block.kind === "formula") {
    return (
      <p className="rounded-lg bg-muted/60 px-4 py-3 text-center text-[15px] font-semibold leading-relaxed text-foreground sm:ml-[3.75rem]">
        {block.text}
      </p>
    )
  }

  if (block.kind === "note") {
    return (
      <div className="flex gap-3 rounded-lg bg-[#FFF7EC] p-3.5 dark:bg-primary/10">
        <span aria-hidden="true" className="w-1 shrink-0 rounded-full bg-primary" />
        <p className="text-sm leading-relaxed text-foreground/90">{block.text}</p>
      </div>
    )
  }

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {block.fields.map((field) => (
        <div key={field.id} className={cn(!field.half && "sm:col-span-2")}>
          <FieldBox field={field} value={values[field.id] ?? ""} error={errors[field.id]} onChange={(v) => onChange(field.id, v)} />
        </div>
      ))}
    </div>
  )
}
