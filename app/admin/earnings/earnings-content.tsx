"use client"

import type React from "react"
import { useCallback, useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Fingerprint,
  RotateCw,
  Landmark,
  Loader2,
  Lock,
  ReceiptText,
  ShieldCheck,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, LoadError, PageHeader, PageShell, StatTile } from "@/components/hub/page-primitives"
import { INVOICE_KIND_LABELS, aud, type InvoiceKind, type TaxStatus } from "@lib/finance/money"
import { useUser } from "@lib/user-context"
import { cn } from "@lib/utils"

type PayoutStatus = "none" | "incomplete" | "pending" | "ready"
type IdentityStatus = "none" | "requires_input" | "processing" | "verified" | "canceled"

interface Earnings {
  identity: { status: IdentityStatus; error: string | null }
  payouts: { status: PayoutStatus; requirementsDue: number; bankName: string | null; last4: string | null }
  tax: { status: TaxStatus | null; gstRegistered: boolean; hasAbn: boolean }
  financialYear: { label: string; royaltyCents: number; gstCents: number; withholdingCents: number; paidCents: number }
  statements: {
    id: string
    number: string
    period: string
    label: string
    status: "sent" | "paid"
    royaltyCents: number
    gstCents: number
    withholdingCents: number
    payableCents: number
    invoiceKind: InvoiceKind
    sentAt: string | null
    paidAt: string | null
    subjects: number
  }[]
}

const TAX_TEXT: Record<TaxStatus, string> = {
  abn: "You quote an ABN, so royalties are paid in full.",
  hobby: "You’ve given us a Statement by a supplier, so royalties are paid in full.",
  "no-abn": "We don’t have your ABN, so 47% of payments over $75 is withheld and paid to the ATO for you.",
}

function StepNumber({ n, done, active }: { n: number; done: boolean; active: boolean }) {
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
        done ? "bg-success text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
      )}
    >
      {done ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : n}
    </span>
  )
}

/** Step 1: Stripe Identity. Payouts stay locked until it's verified. */
function IdentityStep({ data, onVerify, onRefresh, busy }: { data: Earnings["identity"]; onVerify: () => void; onRefresh: () => void; busy: boolean }) {
  const s = data.status
  const copy: Record<IdentityStatus, { title: string; text: string; cta?: string }> = {
    none: { title: "Verify your identity", text: "Takes about two minutes. Have your driver licence or passport ready.", cta: "Verify with Stripe" },
    requires_input: data.error
      ? { title: "Let’s try that again", text: data.error, cta: "Try again" }
      : { title: "Finish verifying", text: "Pick up where you left off.", cta: "Continue" },
    canceled: { title: "Verify your identity", text: "Your last attempt was cancelled.", cta: "Start again" },
    processing: { title: "Checking your ID", text: "Usually a few minutes. We’ll unlock payouts as soon as it’s done." },
    verified: { title: "Identity verified", text: "You’re all set." },
  }
  const c = copy[s]
  const done = s === "verified"

  return (
    <div className={cn("flex gap-4 p-5 sm:p-6", done && "bg-success/5")}>
      <StepNumber n={1} done={done} active={!done} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-medium text-foreground">
          {c.title}
          {s === "processing" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />}
        </p>
        <p className={cn("mt-0.5 text-sm", s === "requires_input" && data.error ? "text-destructive" : "text-muted-foreground")}>{c.text}</p>
        {c.cta && (
          <Button className="mt-4 h-10 gap-2" onClick={onVerify} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Fingerprint className="h-4 w-4" aria-hidden="true" />}
            {c.cta}
          </Button>
        )}
        {s === "processing" && (
          <Button variant="ghost" size="sm" className="mt-3 h-9 gap-1.5 px-2 text-muted-foreground" onClick={onRefresh}>
            <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
            Check again
          </Button>
        )}
      </div>
      <Fingerprint className={cn("hidden h-10 w-10 shrink-0 sm:block", done ? "text-success/40" : "text-primary/25")} aria-hidden="true" />
    </div>
  )
}

function PayoutAccount({ data, onOpen, opening, locked = false }: { data: Earnings["payouts"]; onOpen: () => void; opening: boolean; locked?: boolean }) {
  const content: Record<PayoutStatus, { title: string; text: string; cta: string; tone: string; icon: React.ComponentType<{ className?: string }> }> = {
    none: {
      title: "Set up payouts",
      text: "Royalties are paid through Stripe. You’ll add your bank details on Stripe’s secure pages, so AviPrep never sees them. It takes about five minutes.",
      cta: "Set up with Stripe",
      tone: "bg-primary/10",
      icon: Wallet,
    },
    incomplete: {
      title: "Finish setting up payouts",
      text:
        data.requirementsDue > 0
          ? `Stripe still needs ${data.requirementsDue} detail${data.requirementsDue === 1 ? "" : "s"} from you before we can pay you.`
          : "You started setting up payouts on Stripe but didn’t finish.",
      cta: "Continue on Stripe",
      tone: "bg-warning/15",
      icon: Clock,
    },
    pending: {
      title: "Stripe is checking your details",
      text: "This usually takes a day or two. You don’t need to do anything unless Stripe emails you.",
      cta: "Open Stripe",
      tone: "bg-muted",
      icon: ShieldCheck,
    },
    ready: {
      title: "Ready for payouts",
      text: "Royalties are paid here once each statement is sent. To change your bank account, update it in Stripe.",
      cta: "Manage in Stripe",
      tone: "bg-success/10",
      icon: CheckCircle2,
    },
  }
  const c = content[data.status]
  const Icon = c.icon

  return (
    <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_18rem]">
        <div className={cn("flex gap-4 p-5 sm:p-6", locked && "opacity-60")}>
          <StepNumber n={2} done={data.status === "ready"} active={!locked && data.status !== "ready"} />
          <div className="min-w-0 flex-1">
            <h2 id="payout-account" className="flex items-center gap-2 font-medium text-foreground">
              {!locked && <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
              {locked ? "Set up payouts" : c.title}
            </h2>
            <p className="mt-0.5 max-w-prose text-sm text-muted-foreground">{locked ? "Unlocks once your identity is verified." : c.text}</p>
            {locked ? (
              <p className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                Locked
              </p>
            ) : (
              <Button className="mt-4 h-10 gap-2" variant={data.status === "ready" || data.status === "pending" ? "outline" : "default"} onClick={onOpen} disabled={opening}>
                {opening ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
                {c.cta}
              </Button>
            )}
          </div>
        </div>

        {/* The account, as far as we know it: a name and four digits. */}
        <div className="flex items-center border-t border-border bg-muted/30 p-5 md:border-l md:border-t-0">
          <div className="w-full rounded-xl bg-gradient-to-br from-foreground to-foreground/80 p-4 text-background shadow-e2">
            <div className="flex items-center justify-between">
              <Landmark className="h-5 w-5 opacity-80" aria-hidden="true" />
              <span className="text-[10px] font-semibold uppercase tracking-widest opacity-70">Paid via Stripe</span>
            </div>
            <p className="mt-6 truncate text-sm font-medium opacity-90">{data.bankName ?? (data.last4 ? "Bank account" : "No bank account yet")}</p>
            <p className="mt-1 font-mono text-lg tracking-widest" aria-label={data.last4 ? `Account ending ${data.last4}` : "No account"}>
              •••• •••• {data.last4 ?? "····"}
            </p>
          </div>
        </div>
    </div>
  )
}

export function EarningsContent() {
  const { user } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [data, setData] = useState<Earnings | null>(null)
  const [failed, setFailed] = useState(false)
  const [opening, setOpening] = useState(false)
  const stripeReturn = searchParams.get("stripe")
  const identityReturn = searchParams.get("identity")
  const [verifying, setVerifying] = useState(false)

  const load = useCallback(async (sync = false) => {
    try {
      const res = await fetch(`/api/curators/earnings${sync ? "?sync=1" : ""}`)
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      setFailed(true)
    }
  }, [])

  useEffect(() => {
    load(!!stripeReturn || !!identityReturn)
    if (stripeReturn === "returned") toast.success("Thanks. We’ve checked your Stripe account.")
    if (stripeReturn === "error") toast.error("Couldn’t reach Stripe. Try again shortly.")
    if (stripeReturn || identityReturn) router.replace(pathname, { scroll: false })
  }, [load, stripeReturn, identityReturn, router, pathname])

  // While Stripe checks their ID, look again every few seconds.
  const checking = data?.identity.status === "processing"
  useEffect(() => {
    if (!checking) return
    const t = window.setInterval(() => load(true), 8000)
    return () => window.clearInterval(t)
  }, [checking, load])

  async function verifyIdentity() {
    setVerifying(true)
    try {
      const res = await fetch("/api/curators/identity", { method: "POST" })
      const json = await res.json().catch(() => ({}))
      if (json.url) return window.location.assign(json.url)
      if (json.done) await load(true)
      else toast.error(json.error || "Couldn’t open Stripe.")
    } catch {
      toast.error("Couldn’t open Stripe.")
    }
    setVerifying(false)
  }

  async function openStripe() {
    setOpening(true)
    try {
      const res = await fetch("/api/curators/payouts/setup", { method: "POST" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.url) {
        toast.error(json.error || "Couldn’t open Stripe.")
        setOpening(false)
        return
      }
      window.location.assign(json.url)
    } catch {
      toast.error("Couldn’t open Stripe.")
      setOpening(false)
    }
  }

  if (user?.isAdmin) {
    return (
      <PageShell>
        <EmptyState icon={Lock} title="For curators" description="This is where curators see their statements and payout account. Payouts are managed under Curator payouts." />
      </PageShell>
    )
  }
  if (failed) return <LoadError title="Couldn't load your earnings" message="Refresh to try again." />
  if (!data) {
    return (
      <PageShell>
        <div className="space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-52 rounded-xl" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[88px] rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </PageShell>
    )
  }

  const fy = data.financialYear

  return (
    <PageShell>
      <PageHeader title="Earnings" description="Your statements, invoices and where your royalties are paid." />

      <section aria-label="Getting paid" className="overflow-hidden rounded-xl border border-border bg-card shadow-e1">
        <IdentityStep data={data.identity} onVerify={verifyIdentity} onRefresh={() => load(true)} busy={verifying} />
        <div className="border-t border-border">
          <PayoutAccount data={data.payouts} onOpen={openStripe} opening={opening} locked={data.identity.status !== "verified"} />
        </div>
        <p className="flex items-center gap-1.5 border-t border-border px-5 py-2.5 text-xs text-muted-foreground sm:px-6">
          <Lock className="h-3 w-3" aria-hidden="true" />
          Your ID and bank details are handled by Stripe, not stored by AviPrep.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile icon={ReceiptText} label={`Royalties, ${fy.label}`} value={aud(fy.royaltyCents)} detail={fy.gstCents ? `Plus ${aud(fy.gstCents)} GST` : undefined} />
        <StatTile icon={Wallet} label="Paid to you" value={aud(fy.paidCents)} detail={`${fy.label} so far`} />
        <StatTile icon={Landmark} label="Withheld for the ATO" value={aud(fy.withholdingCents)} detail={fy.withholdingCents ? "Counts towards your tax" : "Nothing withheld"} />
      </div>

      <section aria-labelledby="statements-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="statements-heading" className="text-base font-semibold text-foreground">
              Statements and invoices
            </h2>
            <p className="text-sm text-muted-foreground">They appear here once we send them, early each month.</p>
          </div>
          {data.tax.status && <p className="max-w-md text-xs text-muted-foreground">{TAX_TEXT[data.tax.status]}</p>}
        </div>

        {data.statements.length === 0 ? (
          <EmptyState icon={FileText} title="No statements yet" description="Your first statement arrives early in the month after something you wrote earns royalties." />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-e1">
            {data.statements.map((s) => (
              <li key={s.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_8rem_9rem_auto] sm:items-center sm:gap-4 sm:px-5">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{s.label}</p>
                  <p className="text-xs text-muted-foreground" data-tabular>
                    {s.number} · {s.subjects} subject{s.subjects === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="font-semibold text-foreground" data-tabular>
                    {aud(s.payableCents)}
                  </p>
                  {(s.gstCents > 0 || s.withholdingCents > 0) && (
                    <p className="text-xs text-muted-foreground" data-tabular>
                      {s.gstCents > 0 ? `Incl. ${aud(s.gstCents)} GST` : `${aud(s.withholdingCents)} withheld`}
                    </p>
                  )}
                </div>
                <div>
                  {s.status === "paid" ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                      Paid {s.paidAt && format(new Date(s.paidAt), "d MMM")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" aria-hidden="true" />
                      On its way
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1 sm:justify-end">
                  <Button asChild variant="outline" size="sm" className="h-9 gap-1.5">
                    <a href={`/api/curators/statements/${s.id}`} target="_blank" rel="noopener">
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                      Statement
                      <span className="sr-only">for {s.label} (opens in a new tab)</span>
                    </a>
                  </Button>
                  {s.invoiceKind !== "none" && (
                    <Button asChild variant="outline" size="sm" className="h-9 gap-1.5" title={INVOICE_KIND_LABELS[s.invoiceKind]}>
                      <a href={`/api/curators/statements/${s.id}?doc=invoice`} target="_blank" rel="noopener">
                        <ReceiptText className="h-3.5 w-3.5" aria-hidden="true" />
                        RCTI
                        <span className="sr-only">for {s.label} (opens in a new tab)</span>
                      </a>
                    </Button>
                  )}
                  <Button asChild variant="ghost" size="icon" className="h-9 w-9">
                    <a href={`/api/curators/statements/${s.id}?download=1`} aria-label={`Download the ${s.label} statement`}>
                      <Download className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  )
}
