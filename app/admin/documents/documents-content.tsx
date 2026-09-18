"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { formatDistanceToNowStrict } from "date-fns"
import { toast } from "sonner"
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Download,
  ExternalLink,
  FileSignature,
  FileText,
  Loader2,
  Minus,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, PageHeader, PageShell, SectionHeading } from "@/components/hub/page-primitives"
import { DocumentSheet } from "@/components/curators/document-sheet"
import { SignaturePad } from "@/components/curators/signature-pad"
import { useStudioActivity } from "@/components/curators/presence-beacon"
import { hasErrors, shortNameOf, validateValues, type DocumentTemplate, type FieldErrors, type Values } from "@lib/agreements/templates"
import { cn } from "@lib/utils"

interface DocumentStatus {
  kind: string
  title: string
  shortTitle: string
  subtitle: string
  purpose: string
  appliesWhen?: string
  version: string
  state: "signed" | "needed" | "optional" | "not-needed"
  reason: string
  signed?: { id: string; signerName: string; signedAt: string; version: string; superseded: boolean }
}

interface HistoryRow {
  id: string
  kind: string
  title: string
  version: string
  signerName: string
  signedAt: string
  voidedAt: string | null
}

const ago = (date: string) => formatDistanceToNowStrict(new Date(date), { addSuffix: true })
const onDate = (date: string) =>
  new Date(date).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })

const STATE_STYLE = {
  signed: { icon: CheckCircle2, tone: "text-success", label: "Signed", ring: "border-success/40 bg-success/[0.06]" },
  needed: { icon: AlertCircle, tone: "text-warning", label: "Needs signing", ring: "border-warning/50 bg-warning/[0.07]" },
  optional: { icon: FileText, tone: "text-muted-foreground", label: "Optional", ring: "border-border bg-card" },
  "not-needed": { icon: Minus, tone: "text-muted-foreground", label: "Not needed", ring: "border-border bg-card" },
} as const

export function DocumentsContent() {
  const [documents, setDocuments] = useState<DocumentStatus[]>([])
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState<string | null>(null)

  useStudioActivity(signing ? "signing paperwork" : null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/curators/documents")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setDocuments(data.documents)
      setHistory(data.history)
    } catch {
      toast.error("Couldn't load your paperwork.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (signing) {
    return (
      <SignView
        kind={signing}
        onBack={() => setSigning(null)}
        onSigned={() => {
          setSigning(null)
          setLoading(true)
          load()
        }}
      />
    )
  }

  const outstanding = documents.filter((d) => d.state === "needed")
  const done = documents.filter((d) => d.state !== "needed")

  return (
    <PageShell>
      <PageHeader
        title="Paperwork"
        description="The contracts and tax forms we need before we can pay you. Sign them here and keep your copies."
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : (
        <>
          {outstanding.length === 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-success/40 bg-success/[0.06] px-4 py-3.5">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
              <div>
                <p className="font-medium text-foreground">Nothing outstanding</p>
                <p className="text-sm text-muted-foreground">Nothing here is holding up your pay.</p>
              </div>
            </div>
          )}

          {outstanding.length > 0 && (
            <section>
              <SectionHeading
                title="To sign"
                count={String(outstanding.length)}
                description="A few minutes each. We've filled in what we already know."
              />
              <div className="space-y-3">
                {outstanding.map((doc) => (
                  <DocumentCard key={doc.kind} doc={doc} onSign={() => setSigning(doc.kind)} />
                ))}
              </div>
            </section>
          )}

          {done.length > 0 && (
            <section>
              <SectionHeading title="The rest" />
              <div className="space-y-3">
                {done.map((doc) => (
                  <DocumentCard key={doc.kind} doc={doc} onSign={() => setSigning(doc.kind)} />
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionHeading title="Your signed copies" description="Every document you've signed, older versions included." />
            {history.length === 0 ? (
              <EmptyState icon={FileSignature} title="Nothing signed yet" description="Your copies land here as soon as you sign." />
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-e1">
                {history.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {row.title}
                        {row.voidedAt && <span className="ml-2 text-xs font-normal text-destructive">Voided</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Signed by {row.signerName} on {onDate(row.signedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button asChild variant="ghost" size="sm" className="h-9 gap-1.5">
                        <a href={`/api/curators/documents/signed/${row.id}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          View
                        </a>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="h-9 gap-1.5">
                        <a href={`/api/curators/documents/signed/${row.id}?download=1`}>
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="hidden sm:inline">Download</span>
                        </a>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </PageShell>
  )
}

function DocumentCard({ doc, onSign }: { doc: DocumentStatus; onSign: () => void }) {
  const style = STATE_STYLE[doc.state]
  const Icon = style.icon
  const canSign = doc.state === "needed" || doc.state === "optional" || (doc.state === "signed" && doc.signed?.superseded)

  return (
    <div className={cn("flex flex-wrap items-start gap-x-4 gap-y-3 rounded-xl border px-4 py-4 shadow-e1", style.ring)}>
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", style.tone)} aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{doc.shortTitle}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{doc.purpose}</p>
        <p className="mt-1.5 text-sm text-foreground/80">{doc.reason}</p>

        {doc.signed && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Signed by {doc.signed.signerName} {ago(doc.signed.signedAt)}
            {doc.signed.superseded && " · we've since updated the wording, so please sign the new version"}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {doc.signed && (
          <Button asChild variant="ghost" size="sm" className="h-9 gap-1.5">
            <a href={`/api/curators/documents/signed/${doc.signed.id}`} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Copy
            </a>
          </Button>
        )}
        {canSign && (
          <Button size="sm" variant={doc.state === "needed" ? "default" : "outline"} className="h-9 gap-1.5" onClick={onSign}>
            <FileSignature className="h-3.5 w-3.5" aria-hidden="true" />
            {doc.signed ? "Sign again" : "Fill in and sign"}
          </Button>
        )}
      </div>
    </div>
  )
}

/* --- Filling one in ------------------------------------------------------- */

function SignView({ kind, onBack, onSigned }: { kind: string; onBack: () => void; onSigned: () => void }) {
  const [template, setTemplate] = useState<DocumentTemplate | null>(null)
  const [values, setValues] = useState<Values>({})
  const [signerName, setSignerName] = useState("")
  const [signature, setSignature] = useState<string | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [readToEnd, setReadToEnd] = useState(false)
  const [touched, setTouched] = useState(false)
  const [serverErrors, setServerErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/curators/documents/${kind}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (cancelled) return
        setTemplate(d.template)
        setValues(d.prefill ?? {})
        setSignerName(d.signerName ?? "")
      })
      .catch(() => toast.error("Couldn't open that document."))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [kind])

  const errors = useMemo(() => (template ? validateValues(template, values) : {}), [template, values])
  const shown: FieldErrors = { ...(touched ? errors : {}), ...serverErrors }

  const onRead = useCallback(() => setReadToEnd(true), [])

  const set = (id: string, value: string) => {
    setValues((v) => ({ ...v, [id]: value }))
    setServerErrors(({ [id]: _drop, ...rest }) => rest)
  }

  async function sign() {
    if (!template) return
    setTouched(true)
    if (!readToEnd) {
      toast.error("Scroll to the end of the document first.")
      return
    }
    if (hasErrors(errors) || !signature || signerName.trim().length < 2 || !agreed) {
      toast.error(
        !signature
          ? "Draw your signature before signing."
          : !agreed
            ? "Tick the box to confirm you've read it."
            : "Check the highlighted fields.",
      )
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/curators/documents/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values, signerName: signerName.trim(), signature, agreed: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setServerErrors(data.fields ?? {})
        toast.error(data.error || "That didn't go through. Try again.")
        return
      }
      toast.success(`${shortNameOf(template)} signed. Your copy is ready.`)
      onSigned()
    } catch {
      toast.error("That didn't go through. Try again.")
    } finally {
      setSaving(false)
    }
  }

  if (loading || !template) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 p-4 lg:p-8">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-[32rem] rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 lg:p-8">
      <Button variant="ghost" onClick={onBack} className="-ml-2 h-9 gap-1.5 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Paperwork
      </Button>

      <DocumentSheet template={template} values={values} errors={shown} onChange={set} onReadToEnd={onRead}>
        {/* The declaration and the signature sit inside the document, exactly
            where they'll be on the copy that comes out of it. */}
        {/* inert rather than aria-hidden: it takes the signature out of the tab
            order and the accessibility tree together, instead of leaving
            focusable controls inside a hidden region. */}
        <div className={cn("space-y-4 transition-opacity", !readToEnd && "opacity-40")} inert={!readToEnd}>
          <div className="flex gap-3 rounded-lg bg-muted/60 p-3.5">
            <span aria-hidden="true" className="w-1 shrink-0 rounded-full bg-[#1B5F99]" />
            <p className="text-[15px] leading-relaxed text-foreground">{template.declaration}</p>
          </div>

          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
              agreed ? "border-primary bg-primary/5" : touched ? "border-destructive" : "border-border hover:bg-muted/40",
            )}
          >
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
            />
            <span className="text-sm text-foreground">
              I&apos;ve read this {shortNameOf(template).toLowerCase()} in full and I agree to it.
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-end">
            <SignaturePad onChange={setSignature} invalid={touched && !signature} />
            <div className="space-y-1.5">
              <label htmlFor="signer-name" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Your name
              </label>
              <Input
                id="signer-name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                autoComplete="name"
                maxLength={120}
                aria-invalid={touched && signerName.trim().length < 2 ? true : undefined}
                className="h-11 font-medium"
              />
              <p className="text-xs text-muted-foreground">Dated {onDate(new Date().toISOString())}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <Button onClick={sign} disabled={saving || !readToEnd} className="h-11 gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
              Sign the {shortNameOf(template).toLowerCase()}
            </Button>
            <p className="text-xs text-muted-foreground">
              We record when you signed, the mobile we already texted you on, and a fingerprint of this exact
              document. Enough to stand it up if it&apos;s ever questioned.
            </p>
          </div>
        </div>
      </DocumentSheet>
    </div>
  )
}
