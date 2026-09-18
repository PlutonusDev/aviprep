"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { ArrowUpRight, CheckCircle2, KeyRound, Loader2, MessageSquare, PenLine, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader, PageShell } from "@/components/hub/page-primitives"
import { useStudioActivity } from "@/components/curators/presence-beacon"

interface Status {
  email: string
  member: { id: string; name: string; email: string; arn: string; profilePicture: string | null; suspended: boolean } | null
  claimable: { firstName: string } | null
}

/**
 * The way into the member community. The forums and private messages belong to
 * members, so a curator joins them as one: their own account, linked to this
 * one, badged as a curator wherever they post.
 */
export function CommunityContent() {
  const [status, setStatus] = useState<Status | null>(null)
  const [password, setPassword] = useState("")
  const [arn, setArn] = useState("")
  const [fields, setFields] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [going, setGoing] = useState<string | null>(null)

  useStudioActivity("in the community")

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/curators/community")
      if (!res.ok) throw new Error()
      setStatus(await res.json())
    } catch {
      toast.error("Couldn't check your community account.")
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function join(action: "link" | "create") {
    setBusy(true)
    setFields({})
    try {
      const res = await fetch("/api/curators/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "link" ? { action, password } : { action, arn }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFields(data.fields ?? {})
        toast.error(data.error || "That didn't work.")
        return
      }
      setPassword("")
      toast.success("You're in. Forums and messages are open.")
      load()
    } finally {
      setBusy(false)
    }
  }

  /** Hands over to the main site with a short-lived ticket. */
  async function go(to: "forum" | "messages") {
    setGoing(to)
    try {
      const res = await fetch("/api/curators/community/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) {
        toast.error(data.error || "Couldn't open the community.")
        return
      }
      window.open(data.url, "_blank", "noopener")
    } finally {
      setGoing(null)
    }
  }

  if (!status) {
    return (
      <PageShell>
        <PageHeader title="Community" description="The AviPrep forums and private messages." />
        <Skeleton className="h-56 rounded-xl" />
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader
        title="Community"
        description="The forums and private messages on the main site, where students are already arguing about questions you wrote."
      />

      {status.member ? (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-success/40 bg-success/[0.06] px-4 py-4">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">You&apos;re in the community as {status.member.name}</p>
              <p className="text-sm text-muted-foreground">
                {status.member.email} · ARN {status.member.arn}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              <PenLine className="h-3 w-3" aria-hidden="true" />
              Curator
            </span>
          </div>

          {status.member.suspended && (
            <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground">
              Your posting is suspended in the forums. Email hello@aviprep.com.au if that looks wrong.
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Destination
              icon={Users}
              title="Forums"
              text="Answer the hard ones, compare notes, argue about wake turbulence."
              cta="Open the forums"
              busy={going === "forum"}
              onClick={() => go("forum")}
            />
            <Destination
              icon={MessageSquare}
              title="Private messages"
              text="Message a student or another curator directly."
              cta="Open messages"
              busy={going === "messages"}
              onClick={() => go("messages")}
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Both open on the main site in a new tab, already signed in. Your name carries a Curator badge and your
            highest rating, so nobody has to guess who&apos;s answering.
          </p>
        </>
      ) : status.claimable ? (
        <section className="max-w-lg space-y-4 rounded-xl border border-border bg-card p-5 shadow-e1">
          <div>
            <h2 className="font-medium text-foreground">You already have an AviPrep account</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              There&apos;s already a member account on {status.email}. Sign in with its password and we&apos;ll use
              that one, rather than leaving you with two.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="member-password">Your AviPrep password</Label>
            <Input
              id="member-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && password && join("link")}
              aria-invalid={fields.password ? true : undefined}
              className="h-11"
            />
            {fields.password && (
              <p role="alert" className="text-sm text-destructive">
                {fields.password}
              </p>
            )}
            <p className="text-xs text-muted-foreground">The password for the main site, which might not be your studio one.</p>
          </div>

          <Button onClick={() => join("link")} disabled={busy || !password} className="h-11 gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
            Link my account
          </Button>
        </section>
      ) : (
        <section className="max-w-lg space-y-4 rounded-xl border border-border bg-card p-5 shadow-e1">
          <div>
            <h2 className="font-medium text-foreground">Join the community</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We&apos;ll set one up on {status.email} from the details we already hold. The only thing we&apos;re
              missing is your ARN.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="member-arn">ARN</Label>
            <Input
              id="member-arn"
              inputMode="numeric"
              autoComplete="off"
              placeholder="6 or 7 digits"
              value={arn}
              onChange={(e) => setArn(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && arn && join("create")}
              aria-invalid={fields.arn ? true : undefined}
              className="h-11"
              data-tabular
            />
            {fields.arn && (
              <p role="alert" className="text-sm text-destructive">
                {fields.arn}
              </p>
            )}
          </div>

          <Button onClick={() => join("create")} disabled={busy || !arn} className="h-11 gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Create my member account
          </Button>

          <p className="text-xs text-muted-foreground">
            It starts on your studio password. The account is yours from there: change it, study with it, keep it if
            you ever stop writing for us.
          </p>
        </section>
      )}
    </PageShell>
  )
}

function Destination({
  icon: Icon,
  title,
  text,
  cta,
  busy,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  text: string
  cta: string
  busy: boolean
  onClick: () => void
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-e1">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
      </span>
      <p className="mt-3 font-medium text-foreground">{title}</p>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">{text}</p>
      <Button variant="outline" onClick={onClick} disabled={busy} className="mt-4 h-10 w-full gap-1.5">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {cta}
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
    </div>
  )
}
