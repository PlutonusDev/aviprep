"use client"

import type React from "react"
import { useCallback, useEffect, useState } from "react"
import { formatDistanceToNowStrict } from "date-fns"
import { toast } from "sonner"
import { Clock, HelpCircle, Landmark, Loader2, Mail, MoreHorizontal, PenLine, Plus, Power, RotateCw, Users, X } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, PageHeader, PageShell, SectionHeading, StatTile } from "@/components/hub/page-primitives"
import { credentialLabel, formatMobile } from "@lib/curators/details"
import { cn } from "@lib/utils"
import { PaymentDetailsDialog } from "@/components/admin/payment-details-dialog"
import { InviteDialog } from "./invite-dialog"

interface Curator {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  credentials: string[]
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  questions: { total: number; live: number }
}

interface Invite {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  sentAt: string
  sendCount: number
  expiresAt: string
  status: "pending" | "expired" | "revoked"
}

type Confirm = { kind: "revoke"; invite: Invite } | { kind: "deactivate"; curator: Curator } | null

const ago = (date: string) => formatDistanceToNowStrict(new Date(date), { addSuffix: true })
const shortDate = (date: string) => new Date(date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })

function initialsOf(first?: string | null, last?: string | null, email?: string) {
  const letters = `${first?.[0] ?? ""}${last?.[0] ?? ""}`.trim()
  return (letters || email?.[0] || "?").toUpperCase()
}

function StatusDot({ tone, children }: { tone: "success" | "warning" | "muted" | "destructive"; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-foreground">
      <span
        aria-hidden="true"
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "success" && "bg-success",
          tone === "warning" && "bg-warning",
          tone === "muted" && "bg-muted-foreground/50",
          tone === "destructive" && "bg-destructive",
        )}
      />
      {children}
    </span>
  )
}

function Person({
  first,
  last,
  email,
  dim,
  credentials = [],
}: {
  first?: string | null
  last?: string | null
  email: string
  dim?: boolean
  credentials?: string[]
}) {
  const shown = credentials.filter((c) => c !== "none")
  const name = [first, last].filter(Boolean).join(" ")
  return (
    <div className={cn("flex min-w-0 items-center gap-3", dim && "opacity-60")}>
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="bg-primary/10 text-sm font-semibold text-foreground">{initialsOf(first, last, email)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{name || email}</p>
        {name && <p className="truncate text-xs text-muted-foreground">{email}</p>}
        {shown.length > 0 && (
          <p className="mt-1 flex flex-wrap gap-1">
            {shown.map((c) => (
              <span key={c} title={credentialLabel(c)} className="rounded border border-border bg-muted/60 px-1.5 py-px text-[11px] font-medium text-muted-foreground">
                {credentialLabel(c, true)}
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  )
}

export function CuratorsContent() {
  const [curators, setCurators] = useState<Curator[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [paymentFor, setPaymentFor] = useState<{ id: string; name: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/curators")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCurators(data.curators)
      setInvites(data.invites)
    } catch {
      toast.error("Couldn't load curators.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const resend = useCallback(
    async (inviteId: string) => {
      setBusy(inviteId)
      try {
        const res = await fetch(`/api/admin/curators/invites/${inviteId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "resend" }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(data.error || "The invite didn't send.")
          return false
        }
        toast.success("Invite sent again, with a fresh 7-day link.")
        load()
        return true
      } finally {
        setBusy(null)
      }
    },
    [load],
  )

  async function revoke(invite: Invite) {
    setBusy(invite.id)
    try {
      const res = await fetch(`/api/admin/curators/invites/${invite.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      })
      if (!res.ok) throw new Error()
      toast.success("Invite cancelled. The link no longer works.")
      load()
    } catch {
      toast.error("Couldn't cancel that invite.")
    } finally {
      setBusy(null)
    }
  }

  async function setActive(curator: Curator, isActive: boolean) {
    setBusy(curator.id)
    try {
      const res = await fetch(`/api/admin/curators/${curator.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      })
      if (!res.ok) throw new Error()
      setCurators((list) => list.map((c) => (c.id === curator.id ? { ...c, isActive } : c)))
      toast.success(isActive ? `${curator.firstName} can sign in again.` : `${curator.firstName} has been signed out and can't sign in.`)
    } catch {
      toast.error("Couldn't update that curator.")
    } finally {
      setBusy(null)
    }
  }

  const openInvites = invites.filter((i) => i.status !== "revoked")
  const active = curators.filter((c) => c.isActive)
  const written = curators.reduce((n, c) => n + c.questions.total, 0)
  const live = curators.reduce((n, c) => n + c.questions.live, 0)

  const inviteButton = (
    <Button onClick={() => setInviteOpen(true)} className="h-10 gap-2 self-start">
      <Plus className="h-4 w-4" aria-hidden="true" />
      Invite curator
    </Button>
  )

  return (
    <PageShell>
      <PageHeader title="Curators" description="The people writing for AviPrep. They work in the content studio at curators.aviprep.com.au.">
        {inviteButton}
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile icon={Users} label="Active curators" value={loading ? "–" : String(active.length)} />
        <StatTile
          icon={Mail}
          label="Invites waiting"
          value={loading ? "–" : String(openInvites.filter((i) => i.status === "pending").length)}
        />
        <StatTile
          icon={HelpCircle}
          label="Questions written"
          value={loading ? "–" : written.toLocaleString()}
          detail={loading ? undefined : `${live.toLocaleString()} live`}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : curators.length === 0 && openInvites.length === 0 ? (
        <EmptyState
          icon={PenLine}
          title="No curators yet"
          description="Invite someone by email. They'll get the content guidelines and a link to set up their account."
        >
          {inviteButton}
        </EmptyState>
      ) : (
        <>
          {openInvites.length > 0 && (
            <section>
              <SectionHeading title="Invites" count={String(openInvites.length)} description="Sent, but not accepted yet." />
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-e1">
                {openInvites.map((invite) => {
                  const expired = invite.status === "expired"
                  return (
                    <li key={invite.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <Person first={invite.firstName} last={invite.lastName} email={invite.email} dim={expired} />
                      </div>
                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <div className="text-left sm:text-right">
                          {expired ? (
                            <StatusDot tone="destructive">Expired {ago(invite.expiresAt)}</StatusDot>
                          ) : (
                            <StatusDot tone="warning">Expires {ago(invite.expiresAt)}</StatusDot>
                          )}
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Sent {shortDate(invite.sentAt)}
                            {invite.sendCount > 1 && ` · ${invite.sendCount} times`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant={expired ? "default" : "outline"}
                            size="sm"
                            className="h-9 gap-1.5"
                            onClick={() => resend(invite.id)}
                            disabled={busy === invite.id}
                          >
                            {busy === invite.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                              <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            Resend
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`More for ${invite.email}`}>
                                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() => setConfirm({ kind: "revoke", invite })}
                              >
                                <X className="mr-2 h-4 w-4" aria-hidden="true" />
                                Cancel invite
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          <section>
            <SectionHeading title="Curators" count={String(curators.length)} />
            {curators.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                Nobody has joined yet. Accepted invites show up here.
              </p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-e1">
                {curators.map((curator) => (
                  <li key={curator.id} className="grid gap-3 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_9rem_10rem_auto] sm:items-center sm:gap-4">
                    <Person first={curator.firstName} last={curator.lastName} email={curator.email} dim={!curator.isActive} credentials={curator.credentials} />

                    <div className="text-sm">
                      <p className="font-medium text-foreground" data-tabular>
                        {curator.questions.total.toLocaleString()} {curator.questions.total === 1 ? "question" : "questions"}
                      </p>
                      <p className="text-xs text-muted-foreground" data-tabular>
                        {curator.questions.live.toLocaleString()} live
                      </p>
                    </div>

                    <div>
                      {curator.isActive ? <StatusDot tone="success">Active</StatusDot> : <StatusDot tone="muted">Switched off</StatusDot>}
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {curator.lastLoginAt ? `Seen ${ago(curator.lastLoginAt)}` : `Joined ${shortDate(curator.createdAt)}`}
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-1">
                      <span className="mr-2 hidden text-xs text-muted-foreground xl:inline" data-tabular>
                        {formatMobile(curator.phone)}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`More for ${curator.firstName} ${curator.lastName}`}>
                            {busy === curator.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setPaymentFor({ id: curator.id, name: `${curator.firstName} ${curator.lastName}` })}>
                            <Landmark className="mr-2 h-4 w-4" aria-hidden="true" />
                            Payment details
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a href={`mailto:${curator.email}`}>
                              <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                              Email {curator.firstName}
                            </a>
                          </DropdownMenuItem>
                          {curator.isActive ? (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => setConfirm({ kind: "deactivate", curator })}
                            >
                              <Power className="mr-2 h-4 w-4" aria-hidden="true" />
                              Switch off access
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onSelect={() => setActive(curator, true)}>
                              <Power className="mr-2 h-4 w-4" aria-hidden="true" />
                              Turn access back on
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <PaymentDetailsDialog curator={paymentFor} open={!!paymentFor} onOpenChange={(o) => !o && setPaymentFor(null)} />

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} onInvited={load} onResend={resend} />

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          {confirm?.kind === "revoke" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel this invite?</AlertDialogTitle>
                <AlertDialogDescription>
                  The link sent to {confirm.invite.email} will stop working. You can invite them again later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep it</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={() => revoke(confirm.invite)}
                >
                  Cancel invite
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
          {confirm?.kind === "deactivate" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Switch off {confirm.curator.firstName}’s access?</AlertDialogTitle>
                <AlertDialogDescription>
                  They’ll be signed out straight away and can’t sign in again until you turn it back on. Their content stays as it is.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep access</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={() => setActive(confirm.curator, false)}
                >
                  Switch off
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  )
}
