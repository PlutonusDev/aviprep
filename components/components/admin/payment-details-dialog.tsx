"use client"

import type React from "react"
import { useEffect, useId, useMemo, useState } from "react"
import { toast } from "sonner"
import { AlertCircle, CheckCircle2, ExternalLink, FileText, Landmark, Loader2, ReceiptText, ShieldCheck, ShieldX, Signature, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { INVOICE_KIND_LABELS, formatAbn, isValidAbn, type TaxStatus } from "@lib/finance/money"
import { cn } from "@lib/utils"

interface Payment {
  legalName: string
  tradingName: string
  address: string
  taxStatus: TaxStatus | ""
  abn: string
  gstRegistered: boolean
  hobbyFormAt: string
  rctiAgreementAt: string
  paymentNotes: string
}

interface StripeStatus {
  accountId: string | null
  detailsSubmitted: boolean
  payoutsEnabled: boolean
  requirementsDue: number
  bankName: string | null
  last4: string | null
}

interface Signed {
  id: string
  kind: string
  title: string
  version: string
  signerName: string
  signedAt: string
  ip: string | null
  phone: string | null
  fingerprint: string
  voidedAt: string | null
  voidReason: string | null
}

const EMPTY: Payment = {
  legalName: "",
  tradingName: "",
  address: "",
  taxStatus: "",
  abn: "",
  gstRegistered: false,
  hobbyFormAt: "",
  rctiAgreementAt: "",
  paymentNotes: "",
}

const TAX_OPTIONS: { id: TaxStatus; title: string; hint: string }[] = [
  { id: "abn", title: "ABN", hint: "Paid in full. RCTIs issued." },
  { id: "hobby", title: "Hobby form", hint: "Statement by a supplier. Paid in full." },
  { id: "no-abn", title: "No ABN", hint: "47% withheld over $75." },
]

const toDateInput = (value: string | null | undefined) => (value ? new Date(value).toISOString().slice(0, 10) : "")

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
          <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        </span>
        {title}
      </legend>
      {children}
    </fieldset>
  )
}

function Field({ id, label, hint, error, children, className }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
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

export function PaymentDetailsDialog({
  curator,
  open,
  onOpenChange,
  onSaved,
}: {
  curator: { id: string; name: string } | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}) {
  const uid = useId()
  const id = (name: string) => `${uid}-${name}`
  const [form, setForm] = useState<Payment>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null)
  const [signatures, setSignatures] = useState<Signed[] | null>(null)
  /** Per-signature verification, once an admin asks for it. */
  const [checked, setChecked] = useState<Record<string, { ok: boolean; problem?: string } | "checking">>({})

  useEffect(() => {
    if (!open || !curator) return
    setLoading(true)
    setErrors({})
    fetch(`/api/admin/curators/${curator.id}/payment`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(({ payment: p }) => {
        setStripeStatus({
          accountId: p.stripeAccountId ?? null,
          detailsSubmitted: !!p.stripeDetailsSubmitted,
          payoutsEnabled: !!p.stripePayoutsEnabled,
          requirementsDue: p.stripeRequirementsDue ?? 0,
          bankName: p.stripeBankName ?? null,
          last4: p.stripeBankLast4 ?? null,
        })
        setForm({
          legalName: p.legalName ?? "",
          tradingName: p.tradingName ?? "",
          address: p.address ?? "",
          taxStatus: p.taxStatus ?? "",
          abn: p.abn ? formatAbn(p.abn) : "",
          gstRegistered: !!p.gstRegistered,
          hobbyFormAt: toDateInput(p.hobbyFormAt),
          rctiAgreementAt: toDateInput(p.rctiAgreementAt),
          paymentNotes: p.paymentNotes ?? "",
        })
      })
      .catch(() => toast.error("Couldn't load payment details."))
      .finally(() => setLoading(false))

    setSignatures(null)
    setChecked({})
    fetch(`/api/admin/curators/${curator.id}/documents`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setSignatures(d.signatures))
      .catch(() => setSignatures([]))
  }, [open, curator])

  /** Re-checks the seal and the stored PDF against the hash taken at signing. */
  async function verify(documentId: string) {
    if (!curator) return
    setChecked((c) => ({ ...c, [documentId]: "checking" }))
    try {
      const res = await fetch(`/api/admin/curators/${curator.id}/documents/${documentId}?verify=1`)
      const data = await res.json()
      setChecked((c) => ({ ...c, [documentId]: { ok: !!data.ok, problem: data.problem } }))
      if (data.ok) toast.success("Checks out: the record and the PDF both match what was signed.")
      else toast.error(data.problem || "This signature didn't verify.")
    } catch {
      setChecked((c) => {
        const { [documentId]: _drop, ...rest } = c
        return rest
      })
      toast.error("Couldn't run the check.")
    }
  }

  const set = <K extends keyof Payment>(key: K, value: Payment[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: "" }))
  }

  const abnDigits = form.abn.replace(/\D/g, "")
  const abnState = !abnDigits ? null : abnDigits.length < 11 ? "short" : isValidAbn(abnDigits) ? "valid" : "invalid"

  // What they'll get each month with these settings.
  const outcome = useMemo(() => {
    if (!form.taxStatus) return { tone: "warn", text: "Choose how they’re set up before generating statements." }
    if (form.taxStatus === "no-abn") return { tone: "info", text: "Statement only. 47% is withheld from payments over $75 and paid to the ATO." }
    if (form.taxStatus === "hobby")
      return form.hobbyFormAt
        ? { tone: "good", text: "Statement only, paid in full under their Statement by a supplier." }
        : { tone: "warn", text: "Record when the hobby form arrived. Without it, 47% must be withheld." }
    if (abnState !== "valid") return { tone: "warn", text: "Add a valid ABN." }
    if (!form.rctiAgreementAt) return { tone: "warn", text: "Statement only until the RCTI agreement is signed. Add the date it was signed." }
    return { tone: "good", text: `Statement and ${INVOICE_KIND_LABELS[form.gstRegistered ? "rcti" : "rci"].toLowerCase()}${form.gstRegistered ? ", with 10% GST added" : ", no GST"}.` }
  }, [form.taxStatus, form.hobbyFormAt, form.rctiAgreementAt, form.gstRegistered, abnState])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!curator) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/curators/${curator.id}/payment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrors(data.fields ?? {})
        toast.error(data.error || "Couldn't save.")
        return
      }
      toast.success("Payment details saved")
      onSaved?.()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const described = (name: string, hint?: boolean) => (errors[name] ? `${id(name)}-error` : hint ? `${id(name)}-hint` : undefined)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-2xl">
        <form onSubmit={save} noValidate>
          <DialogHeader className="border-b border-border px-6 py-5">
            <DialogTitle className="font-heading text-xl">Payment details</DialogTitle>
            <DialogDescription>{curator?.name}. Tax details for their statements and invoices. Bank details are theirs to manage in Stripe.</DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(100dvh-15rem)] space-y-8 overflow-y-auto px-6 py-6">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <Section icon={ReceiptText} title="How they’re set up">
                  <div role="radiogroup" aria-label="Tax status" className="grid gap-2 sm:grid-cols-3">
                    {TAX_OPTIONS.map((o) => {
                      const selected = form.taxStatus === o.id
                      return (
                        <button
                          key={o.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => set("taxStatus", o.id)}
                          className={cn(
                            "rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            selected ? "border-primary bg-primary/10" : "border-border hover:border-foreground/30",
                          )}
                        >
                          <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                            {selected && <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
                            {o.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">{o.hint}</span>
                        </button>
                      )
                    })}
                  </div>

                  {form.taxStatus === "abn" && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field id={id("abn")} label="ABN" error={errors.abn}>
                        <div className="relative">
                          <Input
                            id={id("abn")}
                            inputMode="numeric"
                            autoComplete="off"
                            placeholder="12 345 678 901"
                            className="h-10 pr-9"
                            value={form.abn}
                            onChange={(e) => set("abn", e.target.value)}
                            onBlur={() => abnState === "valid" && set("abn", formatAbn(abnDigits))}
                            aria-invalid={abnState === "invalid" || !!errors.abn ? true : undefined}
                            aria-describedby={`${id("abn")}-state ${described("abn") ?? ""}`.trim()}
                          />
                          {abnState === "valid" && <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-success" aria-hidden="true" />}
                        </div>
                        <p id={`${id("abn")}-state`} className={cn("text-xs", abnState === "invalid" ? "text-destructive" : "sr-only")}>
                          {abnState === "invalid" ? "That ABN doesn’t check out." : abnState === "valid" ? "Valid ABN" : ""}
                        </p>
                      </Field>
                      <Field id={id("rcti")} label="RCTI agreement signed" hint="RCTIs are only issued once it’s signed.">
                        <Input
                          id={id("rcti")}
                          type="date"
                          className="h-10"
                          value={form.rctiAgreementAt}
                          onChange={(e) => set("rctiAgreementAt", e.target.value)}
                          aria-describedby={`${id("rcti")}-hint`}
                        />
                      </Field>
                      <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3 sm:col-span-2">
                        <Label htmlFor={id("gst")} className="cursor-pointer font-normal">
                          <span className="block text-sm font-medium text-foreground">Registered for GST</span>
                          <span className="block text-xs text-muted-foreground">Adds 10% GST to their royalties and makes their RCTI a tax invoice.</span>
                        </Label>
                        <Switch id={id("gst")} checked={form.gstRegistered} onCheckedChange={(v) => set("gstRegistered", v)} />
                      </div>
                    </div>
                  )}

                  {form.taxStatus === "hobby" && (
                    <Field id={id("hobby")} label="Hobby form received" hint="Statement by a supplier (NAT 3346). Keep the signed copy on file.">
                      <Input
                        id={id("hobby")}
                        type="date"
                        className="h-10 sm:max-w-56"
                        value={form.hobbyFormAt}
                        onChange={(e) => set("hobbyFormAt", e.target.value)}
                        aria-describedby={`${id("hobby")}-hint`}
                      />
                    </Field>
                  )}

                  <p
                    role="status"
                    className={cn(
                      "flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm",
                      outcome.tone === "good" && "bg-success/10 text-foreground",
                      outcome.tone === "warn" && "bg-warning/10 text-foreground",
                      outcome.tone === "info" && "bg-muted text-foreground",
                    )}
                  >
                    {outcome.tone === "good" ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                    ) : (
                      <AlertCircle className={cn("mt-0.5 h-4 w-4 shrink-0", outcome.tone === "warn" ? "text-warning" : "text-muted-foreground")} aria-hidden="true" />
                    )}
                    {outcome.text}
                  </p>
                </Section>

                <Section icon={UserRound} title="On their invoices">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id={id("legal")} label="Legal name" hint="Blank uses their account name.">
                      <Input id={id("legal")} className="h-10" value={form.legalName} onChange={(e) => set("legalName", e.target.value)} aria-describedby={`${id("legal")}-hint`} />
                    </Field>
                    <Field id={id("trading")} label="Trading name">
                      <Input id={id("trading")} className="h-10" value={form.tradingName} onChange={(e) => set("tradingName", e.target.value)} />
                    </Field>
                    <Field id={id("address")} label="Address" className="sm:col-span-2">
                      <Input id={id("address")} autoComplete="off" className="h-10" value={form.address} onChange={(e) => set("address", e.target.value)} />
                    </Field>
                  </div>
                </Section>

                <Section icon={Landmark} title="Payouts">
                  {(() => {
                    const st = stripeStatus
                    const state = !st?.accountId
                      ? { tone: "bg-muted", title: "Not set up", text: "They set up payouts on Stripe from the Earnings page in the content studio. Their statement email reminds them." }
                      : !st.detailsSubmitted
                        ? { tone: "bg-warning/10", title: "Setup unfinished", text: `Stripe still needs ${st.requirementsDue || "some"} detail${st.requirementsDue === 1 ? "" : "s"} from them.` }
                        : !st.payoutsEnabled
                          ? { tone: "bg-warning/10", title: "Stripe is verifying", text: "They can be paid once Stripe finishes checking their details." }
                          : { tone: "bg-success/10", title: "Ready for payouts", text: "Royalties are transferred to their Stripe account and paid out to their bank." }
                    return (
                      <div className={cn("flex flex-wrap items-center justify-between gap-4 rounded-lg p-4", state.tone)}>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{state.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{state.text}</p>
                        </div>
                        {st?.last4 && (
                          <p className="font-mono text-sm text-foreground" aria-label={`Account ending ${st.last4}`}>
                            {st.bankName ? `${st.bankName} ` : ""}•••• {st.last4}
                          </p>
                        )}
                      </div>
                    )
                  })()}
                </Section>

                <Section icon={Signature} title="Signed paperwork">
                  {signatures === null ? (
                    <Skeleton className="h-16 w-full" />
                  ) : signatures.length === 0 ? (
                    <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                      Nothing signed yet. They fill these in themselves under Paperwork in the content studio.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                      {signatures.map((row) => {
                        const state = checked[row.id]
                        return (
                          <li key={row.id} className="px-3.5 py-3">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">
                                  {row.title}
                                  {row.voidedAt && <span className="ml-2 text-xs font-normal text-destructive">Voided</span>}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {row.signerName} ·{" "}
                                  {new Date(row.signedAt).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}
                                  {row.ip && ` · ${row.ip}`}
                                </p>
                              </div>
                              <Button asChild type="button" variant="ghost" size="sm" className="h-8 gap-1.5">
                                <a href={`/api/admin/curators/${curator?.id}/documents/${row.id}`} target="_blank" rel="noreferrer">
                                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                  Open
                                </a>
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5"
                                onClick={() => verify(row.id)}
                                disabled={state === "checking"}
                              >
                                {state === "checking" ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                ) : state && state.ok ? (
                                  <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                                ) : state ? (
                                  <ShieldX className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
                                ) : (
                                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                )}
                                {state && state !== "checking" ? (state.ok ? "Verified" : "Failed") : "Verify"}
                              </Button>
                            </div>
                            {state && state !== "checking" && !state.ok && state.problem && (
                              <p role="alert" className="mt-1.5 text-xs text-destructive">
                                {state.problem}
                              </p>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </Section>

                <Section icon={FileText} title="Notes">
                  <Label htmlFor={id("notes")} className="sr-only">
                    Notes
                  </Label>
                  <Textarea
                    id={id("notes")}
                    rows={2}
                    className="resize-none"
                    placeholder="Only admins see this."
                    value={form.paymentNotes}
                    onChange={(e) => set("paymentNotes", e.target.value)}
                  />
                </Section>
              </>
            )}
          </div>

          <DialogFooter className="gap-2 border-t border-border bg-muted/30 px-6 py-4">
            <Button type="button" variant="outline" className="h-10" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="h-10" disabled={saving || loading}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />}
              Save details
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
