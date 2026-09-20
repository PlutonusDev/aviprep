"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { Loader2, Mail, MoreHorizontal, RotateCw, Trash2, UserPlus, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useSchool } from "../layout"

/**
 * Everyone who can get into this school's panel, and the invites still open.
 *
 * Any instructor can invite another; only the owner can remove someone, and
 * anyone can show themselves out.
 */

interface Instructor {
  id: string
  firstName: string
  lastName: string
  email: string
  profilePicture: string | null
  createdAt: string
  isOwner: boolean
}

interface Invite {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  sentAt: string
  expiresAt: string
  status: "pending" | "expired" | "accepted" | "revoked"
  invitedBy: string | null
}

const initials = (first: string, last: string) => `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase()

export default function InstructorsPage() {
  const router = useRouter()
  const { school } = useSchool()
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [you, setYou] = useState<{ id: string; isOwner: boolean } | null>(null)
  const [loading, setLoading] = useState(true)

  const [inviting, setInviting] = useState(false)
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "", note: "" })
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)

  const [removing, setRemoving] = useState<Instructor | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/school/instructors")
      if (!res.ok) return
      const data = await res.json()
      setInstructors(data.instructors)
      setInvites(data.invites)
      setYou(data.you)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setError(null)
    try {
      const res = await fetch("/api/school/instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return setError(data.error || "The invite didn't send.")
      setSent(form.email)
      setForm({ email: "", firstName: "", lastName: "", note: "" })
      setInviting(false)
      load()
    } finally {
      setSending(false)
    }
  }

  async function resend(invite: Invite) {
    setBusyId(invite.id)
    try {
      await fetch(`/api/school/instructors/invites/${invite.id}`, { method: "POST" })
      setSent(invite.email)
      load()
    } finally {
      setBusyId(null)
    }
  }

  async function revoke(invite: Invite) {
    setBusyId(invite.id)
    try {
      await fetch(`/api/school/instructors/invites/${invite.id}`, { method: "DELETE" })
      load()
    } finally {
      setBusyId(null)
    }
  }

  async function remove(person: Instructor) {
    setBusyId(person.id)
    try {
      const res = await fetch(`/api/school/instructors?userId=${person.id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      setRemoving(null)
      // Removing yourself means you've just lost this page.
      if (data.leftSchool) return router.push("/dashboard")
      load()
    } finally {
      setBusyId(null)
    }
  }

  const isYou = (id: string) => you?.id === id

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Instructors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everyone here can manage {school?.name ?? "the school"} &mdash; its students, groups and subjects.
          </p>
        </div>
        <Button onClick={() => setInviting(true)} className="gap-2">
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Invite an instructor
        </Button>
      </div>

      {sent && (
        <p className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-foreground">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            Invite sent to <span className="font-medium">{sent}</span>.
          </span>
          <button onClick={() => setSent(null)} aria-label="Dismiss" className="shrink-0 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">With access</CardTitle>
          <CardDescription>
            {instructors.length} {instructors.length === 1 ? "person" : "people"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {instructors.map((person) => (
                <li key={person.id} className="flex items-center gap-3 py-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={person.profilePicture || undefined} />
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-foreground">
                      {initials(person.firstName, person.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                      <span className="truncate">
                        {person.firstName} {person.lastName}
                      </span>
                      {person.isOwner && (
                        <span className="rounded border border-primary/30 bg-primary/10 px-1.5 text-[10px] font-semibold uppercase tracking-wide">Owner</span>
                      )}
                      {isYou(person.id) && <span className="text-xs font-normal text-muted-foreground">you</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{person.email}</p>
                  </div>
                  {!person.isOwner && (you?.isOwner || isYou(person.id)) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setRemoving(person)}
                    >
                      {isYou(person.id) ? "Leave" : "Remove"}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Waiting to accept</CardTitle>
            <CardDescription>Invites that haven&rsquo;t been used yet.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y divide-border">
              {invites.map((invite) => (
                <li key={invite.id} className="flex items-center gap-3 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {invite.status === "expired" ? "Expired" : "Sent"} {formatDistanceToNow(new Date(invite.sentAt), { addSuffix: true })}
                      {invite.invitedBy ? ` by ${invite.invitedBy}` : ""}
                    </p>
                  </div>
                  {invite.status === "expired" && (
                    <span className="shrink-0 rounded bg-warning/15 px-1.5 py-px text-xs text-foreground">Expired</span>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0" disabled={busyId === invite.id} aria-label={`Invite to ${invite.email}`}>
                        {busyId === invite.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => resend(invite)}>
                        <RotateCw className="mr-2 h-4 w-4" aria-hidden="true" />
                        Send it again
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => revoke(invite)}>
                        <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                        Cancel the invite
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* --- Invite --------------------------------------------------------- */}
      <Dialog open={inviting} onOpenChange={(open) => !sending && setInviting(open)}>
        <DialogContent className="max-w-md">
          <form onSubmit={sendInvite}>
            <DialogHeader>
              <DialogTitle>Invite an instructor</DialogTitle>
              <DialogDescription>They&rsquo;ll get a link that works for two weeks.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="them@flightschool.com.au"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-first">First name</Label>
                  <Input id="invite-first" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-last">Last name</Label>
                  <Input id="invite-last" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-note">Note</Label>
                <Textarea
                  id="invite-note"
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
              <Button type="button" variant="ghost" onClick={() => setInviting(false)} disabled={sending}>
                Cancel
              </Button>
              <Button type="submit" disabled={sending} className="gap-2">
                {sending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Send the invite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- Remove or leave ------------------------------------------------ */}
      <Dialog open={!!removing} onOpenChange={(open) => !open && setRemoving(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{removing && isYou(removing.id) ? "Leave this school?" : `Remove ${removing?.firstName}?`}</DialogTitle>
            <DialogDescription>
              {removing && isYou(removing.id)
                ? "You'll lose access to the school panel. Another instructor would have to invite you back."
                : "They lose access to the panel straight away. Their AviPrep account isn't touched."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={!!busyId} onClick={() => removing && remove(removing)} className="gap-2">
              {busyId && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {removing && isYou(removing.id) ? "Leave" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
