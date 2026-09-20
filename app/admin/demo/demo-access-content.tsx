"use client"

import { useCallback, useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import { Check, Copy, Eye, Loader2, Mail, MoreHorizontal, RotateCw, Send, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState, PageHeader, PageShell, StatTile } from "@/components/hub/page-primitives"
import { cn } from "@lib/utils"

/** Who's been sent the demo portal, and what they did with it. */

interface Grant {
  id: string
  organisation: string
  contactName: string | null
  email: string
  codeHint: string
  note: string | null
  status: "active" | "expired" | "revoked"
  sentAt: string
  sendCount: number
  expiresAt: string
  firstOpenedAt: string | null
  lastOpenedAt: string | null
  opens: number
  sentBy: string | null
}

const STATUS: Record<Grant["status"], { label: string; tone: string }> = {
  active: { label: "Active", tone: "bg-success/15 text-success" },
  expired: { label: "Expired", tone: "bg-muted text-muted-foreground" },
  revoked: { label: "Revoked", tone: "bg-destructive/10 text-destructive" },
}

const BLANK = { organisation: "", contactName: "", email: "", note: "", days: 30 }

export function DemoAccessContent() {
  const [grants, setGrants] = useState<Grant[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [error, setError] = useState<string | null>(null)
  /** Shown once after sending, for reading out over the phone. */
  const [issued, setIssued] = useState<{ organisation: string; code: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/demo-access")
      if (res.ok) setGrants((await res.json()).grants ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/demo-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return setError(data.error || "That didn't send.")
      setIssued({ organisation: form.organisation, code: data.code })
      setForm(BLANK)
      setOpen(false)
      load()
    } finally {
      setSending(false)
    }
  }

  async function resend(grant: Grant) {
    setBusyId(grant.id)
    try {
      const res = await fetch(`/api/admin/demo-access/${grant.id}`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return toast.error(data.error || "That didn't send.")
      setIssued({ organisation: grant.organisation, code: data.code })
      load()
    } finally {
      setBusyId(null)
    }
  }

  async function revoke(grant: Grant) {
    setBusyId(grant.id)
    try {
      await fetch(`/api/admin/demo-access/${grant.id}`, { method: "DELETE" })
      load()
    } finally {
      setBusyId(null)
    }
  }

  const active = grants.filter((g) => g.status === "active")
  const opened = grants.filter((g) => g.opens > 0)

  return (
    <PageShell>
      <PageHeader title="Demo access" description="Codes for the flight school demo portal.">
        <Button onClick={() => setOpen(true)} className="h-11 shrink-0 gap-2">
          <Send className="h-4 w-4" aria-hidden="true" />
          Send an invite
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Mail} label="Sent" value={String(grants.length)} />
        <StatTile icon={Check} label="Active" value={String(active.length)} />
        <StatTile icon={Eye} label="Opened" value={String(opened.length)} detail={`${grants.reduce((n, g) => n + g.opens, 0)} times`} />
        <StatTile
          icon={Eye}
          label="Never opened"
          value={String(grants.filter((g) => g.opens === 0 && g.status === "active").length)}
          detail="Worth a follow-up"
        />
      </div>

      {issued && (
        <div className="rounded-xl border border-success/30 bg-success/10 p-4">
          <p className="text-sm font-medium text-foreground">Sent to {issued.organisation}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <code className="rounded-lg border border-border bg-background px-4 py-2 font-mono text-lg tracking-[0.15em] text-foreground">{issued.code}</code>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => {
                navigator.clipboard.writeText(issued.code)
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }}
            >
              {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="ghost" size="sm" className="h-9" onClick={() => setIssued(null)}>
              Done
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Last time you&rsquo;ll see it. Resending makes a new one.</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      ) : grants.length === 0 ? (
        <EmptyState icon={Mail} title="Nothing sent yet" description="Send an RTO a code and they can walk through the panel themselves." />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {grants.map((grant) => (
            <li key={grant.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                  <span className="truncate">{grant.organisation}</span>
                  <span className={cn("rounded px-1.5 py-px text-[11px] font-medium", STATUS[grant.status].tone)}>{STATUS[grant.status].label}</span>
                  <span className="font-mono text-xs font-normal text-muted-foreground">····{grant.codeHint}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {grant.contactName ? `${grant.contactName} · ` : ""}
                  {grant.email}
                </p>
              </div>

              <div className="text-right text-xs text-muted-foreground">
                {grant.opens > 0 ? (
                  <>
                    <p className="font-medium text-foreground">
                      Opened {grant.opens} {grant.opens === 1 ? "time" : "times"}
                    </p>
                    <p>{grant.lastOpenedAt ? `Last ${formatDistanceToNow(new Date(grant.lastOpenedAt), { addSuffix: true })}` : ""}</p>
                  </>
                ) : (
                  <>
                    <p>Not opened</p>
                    <p>Sent {formatDistanceToNow(new Date(grant.sentAt), { addSuffix: true })}</p>
                  </>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" disabled={busyId === grant.id} aria-label={`Actions for ${grant.organisation}`}>
                    {busyId === grant.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => resend(grant)}>
                    <RotateCw className="mr-2 h-4 w-4" aria-hidden="true" />
                    Send a new code
                  </DropdownMenuItem>
                  {grant.status === "active" && (
                    <DropdownMenuItem className="text-destructive" onClick={() => revoke(grant)}>
                      <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                      Revoke
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={(o) => !sending && setOpen(o)}>
        <DialogContent className="max-w-md">
          <form onSubmit={send}>
            <DialogHeader>
              <DialogTitle>Send an invite</DialogTitle>
              <DialogDescription>They get a code and a link straight into the portal.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="org">Organisation</Label>
                <Input id="org" required value={form.organisation} onChange={(e) => setForm((f) => ({ ...f, organisation: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="contact">Contact</Label>
                  <Input id="contact" value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="days">Days valid</Label>
                  <Input
                    id="days"
                    type="number"
                    min={1}
                    max={365}
                    value={form.days}
                    onChange={(e) => setForm((f) => ({ ...f, days: Number(e.target.value) || 30 }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="note">Note</Label>
                <Textarea
                  id="note"
                  rows={3}
                  maxLength={500}
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="Optional. Goes in the email."
                  className="resize-none"
                />
              </div>
              {error && (
                <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-foreground">
                  {error}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={sending}>
                Cancel
              </Button>
              <Button type="submit" disabled={sending} className="gap-2">
                {sending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Send
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
