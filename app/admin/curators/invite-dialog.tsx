"use client"

import type React from "react"
import { useEffect, useId, useRef, useState } from "react"
import { AlertCircle, ArrowRight, Check, FileText, Loader2, RotateCw, Send } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@lib/utils"

const NOTE_MAX = 600

interface Draft {
  email: string
  firstName: string
  lastName: string
  phone: string
  note: string
}

const EMPTY: Draft = { email: "", firstName: "", lastName: "", phone: "", note: "" }

type Result = { email: string; attachedGuidelines: boolean }

function Field({
  id,
  label,
  optional,
  hint,
  error,
  children,
  className,
}: {
  id: string
  label: string
  optional?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="flex items-baseline gap-1.5">
        {label}
        {optional && <span className="text-xs font-normal text-muted-foreground">Optional</span>}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

/** A small, faithful sketch of the email they'll get, so the note reads right before it goes. */
function EmailPreview({ draft }: { draft: Draft }) {
  const name = draft.firstName.trim()
  return (
    <div aria-hidden="true" className="flex h-full flex-col rounded-xl border border-border bg-muted/40 p-3">
      <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Preview</p>
      <div className="flex-1 overflow-hidden rounded-lg border border-border bg-card shadow-e1">
        <div className="h-1 bg-primary" />
        <div className="space-y-3 p-4">
          <p className="truncate text-xs text-muted-foreground">
            To <span className="text-foreground">{draft.email.trim() || "their email"}</span>
          </p>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Content studio invite</p>
            <p className="mt-1 font-heading text-lg font-bold leading-snug text-foreground">
              {name ? `${name}, come write with us` : "Come write with us"}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              You’ve been invited to join AviPrep as a content curator, writing questions and lessons for student pilots.
            </p>
          </div>
          {draft.note.trim() && (
            <p className="whitespace-pre-line rounded-md bg-primary/10 px-3 py-2 text-xs leading-relaxed text-foreground">{draft.note.trim()}</p>
          )}
          <span className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground">
            Set up your account
          </span>
          <div className="flex items-center gap-2.5 rounded-md border border-border p-2">
            <span className="flex h-8 w-7 shrink-0 items-center justify-center rounded bg-primary/10">
              <FileText className="h-3.5 w-3.5 text-primary" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium text-foreground">AviPrep-Content-Guidelines.pdf</span>
              <span className="block text-[11px] text-muted-foreground">Attached</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function InviteDialog({
  open,
  onOpenChange,
  onInvited,
  onResend,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInvited: () => void
  /** Resends an invite that's already waiting; resolves true when it went. */
  onResend: (inviteId: string) => Promise<boolean>
}) {
  const uid = useId()
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  // Start fresh each time it opens.
  useEffect(() => {
    if (!open) return
    setDraft(EMPTY)
    setErrors({})
    setFormError(null)
    setPendingInviteId(null)
    setResult(null)
  }, [open])

  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDraft((d) => ({ ...d, [key]: e.target.value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
    setFormError(null)
    setPendingInviteId(null)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setFormError(null)
    try {
      const res = await fetch("/api/admin/curators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrors(data.fields ?? {})
        setFormError(data.error || "The invite didn't send.")
        setPendingInviteId(data.pendingInviteId ?? null)
        if (data.fields?.email) emailRef.current?.focus()
        return
      }
      setResult({ email: draft.email.trim(), attachedGuidelines: data.attachedGuidelines })
      onInvited()
    } catch {
      setFormError("Couldn't reach the server. Check your connection.")
    } finally {
      setSending(false)
    }
  }

  async function resendInstead() {
    if (!pendingInviteId) return
    setSending(true)
    const ok = await onResend(pendingInviteId)
    setSending(false)
    if (ok) setResult({ email: draft.email.trim(), attachedGuidelines: true })
  }

  const id = (name: string) => `${uid}-${name}`
  const describe = (name: keyof Draft, hint?: boolean) =>
    errors[name] ? `${id(name)}-error` : hint ? `${id(name)}-hint` : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("gap-0 p-0", result ? "sm:max-w-md" : "sm:max-w-3xl")}>
        {result ? (
          <div className="flex flex-col items-center px-6 pb-6 pt-10 text-center sm:px-10">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-300">
              <Check className="h-7 w-7 text-success" aria-hidden="true" />
            </span>
            <DialogHeader className="mt-5 items-center space-y-1.5 text-center sm:text-center">
              <DialogTitle className="font-heading text-xl">Invite sent</DialogTitle>
              <DialogDescription>
                We emailed <span className="font-medium text-foreground">{result.email}</span>. The link works for 7 days.
              </DialogDescription>
            </DialogHeader>
            {!result.attachedGuidelines && (
              <Alert className="mt-5 text-left">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>The guidelines PDF couldn't be found on the server, so it wasn't attached.</AlertDescription>
              </Alert>
            )}
            <div className="mt-8 flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-center">
              <Button variant="outline" className="h-10" onClick={() => {
                  setResult(null)
                  setDraft(EMPTY)
                }}>
                Invite someone else
              </Button>
              <Button className="h-10" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <DialogHeader className="border-b border-border px-6 py-5">
              <DialogTitle className="font-heading text-xl">Invite a curator</DialogTitle>
              <DialogDescription>
                They’ll get an email to set up their account, with the content guidelines attached. Anything you leave blank, they fill in.
              </DialogDescription>
            </DialogHeader>

            <div className="grid max-h-[calc(100dvh-14rem)] gap-6 overflow-y-auto px-6 py-5 md:grid-cols-[1fr_17rem]">
              <div className="space-y-4">
                {formError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    <AlertDescription className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span>{formError}</span>
                      {pendingInviteId && (
                        <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5" onClick={resendInstead} disabled={sending}>
                          <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                          Resend it
                        </Button>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <Field id={id("email")} label="Email" error={errors.email}>
                  <Input
                    ref={emailRef}
                    id={id("email")}
                    type="email"
                    autoComplete="off"
                    placeholder="name@example.com"
                    className="h-10"
                    value={draft.email}
                    onChange={set("email")}
                    aria-invalid={errors.email ? true : undefined}
                    aria-describedby={describe("email")}
                    autoFocus
                    required
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id={id("firstName")} label="First name" optional error={errors.firstName}>
                    <Input
                      id={id("firstName")}
                      autoComplete="off"
                      className="h-10"
                      value={draft.firstName}
                      onChange={set("firstName")}
                      aria-describedby={describe("firstName")}
                    />
                  </Field>
                  <Field id={id("lastName")} label="Last name" optional error={errors.lastName}>
                    <Input
                      id={id("lastName")}
                      autoComplete="off"
                      className="h-10"
                      value={draft.lastName}
                      onChange={set("lastName")}
                      aria-describedby={describe("lastName")}
                    />
                  </Field>
                </div>

                <Field id={id("phone")} label="Mobile" optional hint="They confirm it by text when they join." error={errors.phone}>
                  <Input
                    id={id("phone")}
                    type="tel"
                    inputMode="tel"
                    autoComplete="off"
                    placeholder="0412 345 678"
                    className="h-10"
                    value={draft.phone}
                    onChange={set("phone")}
                    aria-invalid={errors.phone ? true : undefined}
                    aria-describedby={describe("phone", true)}
                  />
                </Field>

                <Field id={id("note")} label="Personal note" optional hint={`${draft.note.length}/${NOTE_MAX}`}>
                  <Textarea
                    id={id("note")}
                    rows={3}
                    maxLength={NOTE_MAX}
                    placeholder="Great chatting today. Looking forward to your nav questions."
                    className="resize-none"
                    value={draft.note}
                    onChange={set("note")}
                    aria-describedby={describe("note", true)}
                  />
                </Field>
              </div>

              <div className="hidden md:block">
                <EmailPreview draft={draft} />
              </div>
            </div>

            <DialogFooter className="gap-2 border-t border-border bg-muted/30 px-6 py-4 sm:justify-between">
              <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                They sign up at curators.aviprep.com.au
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button type="button" variant="outline" className="h-10" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="h-10 gap-2" disabled={sending || !draft.email.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                  {sending ? "Sending..." : "Send invite"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
