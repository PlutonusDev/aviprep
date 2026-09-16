"use client"

import type React from "react"
import { useEffect, useId, useRef, useState } from "react"
import { toast } from "sonner"
import { Camera, EyeOff, Loader2, Lock, Trash2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { ContributorNames, ContributorStack } from "@/components/attribution/contributors"
import { EmptyState, LoadError, PageHeader, PageShell } from "@/components/hub/page-primitives"
import { credentialLabel, formatMobile } from "@lib/curators/details"
import { useUser } from "@lib/user-context"
import { cn } from "@lib/utils"

interface Profile {
  firstName: string
  lastName: string
  email: string
  phone: string
  credentials: string[]
  profilePicture: string | null
  showAttribution: boolean
}

const initials = (p: { firstName: string; lastName: string }) => `${p.firstName[0] ?? ""}${p.lastName[0] ?? ""}`.toUpperCase() || "?"

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-e1">
      <header className="border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

/** A faithful miniature of where students see a curator's name. */
function Preview({ profile }: { profile: Profile }) {
  const me = [{ id: "me", name: `${profile.firstName} ${profile.lastName}`.trim(), avatar: profile.profilePicture }]
  const shown = profile.showAttribution ? me : []

  return (
    <section aria-label="What students see" className="space-y-4 lg:sticky lg:top-20">
      <p className="text-sm font-semibold text-foreground">What students see</p>

      <figure className="overflow-hidden rounded-xl border border-border bg-card shadow-e1">
        <div aria-hidden="true" className="space-y-2.5 p-5">
          <div className="h-3 w-2/5 rounded bg-foreground/80" />
          <div className="h-2 w-full rounded bg-muted" />
          <div className="h-2 w-11/12 rounded bg-muted" />
          <div className="h-2 w-4/5 rounded bg-muted" />
        </div>
        <div className="flex min-h-14 items-center justify-end border-t border-border px-5 py-3">
          {shown.length ? (
            <ContributorStack contributors={shown} />
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
              No name shown
            </span>
          )}
        </div>
        <figcaption className="border-t border-border bg-muted/40 px-5 py-2 text-xs text-muted-foreground">End of a lesson, and on course pages</figcaption>
      </figure>

      <figure className="overflow-hidden rounded-xl border border-border bg-card shadow-e1">
        <div aria-hidden="true" className="space-y-3 p-5">
          <div className="h-2.5 w-full rounded bg-foreground/70" />
          <div className="h-2.5 w-3/5 rounded bg-foreground/70" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2.5 rounded-lg border border-border p-2.5">
              <span className="h-5 w-5 rounded-md border border-border" />
              <span className={cn("h-2 rounded bg-muted", i === 1 ? "w-1/2" : "w-2/3")} />
            </div>
          ))}
        </div>
        <div className="flex min-h-10 items-center justify-end px-5 pb-3">
          {shown.length ? <ContributorNames contributors={shown} /> : <span className="text-xs text-muted-foreground">No name shown</span>}
        </div>
        <figcaption className="border-t border-border bg-muted/40 px-5 py-2 text-xs text-muted-foreground">Under each exam question</figcaption>
      </figure>
    </section>
  )
}

export function AccountContent() {
  const uid = useId()
  const { user, refresh } = useUser()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [failed, setFailed] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [savingAttribution, setSavingAttribution] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user?.isAdmin) return
    fetch("/api/curators/profile")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(({ profile }) => {
        setProfile(profile)
        setFirstName(profile.firstName)
        setLastName(profile.lastName)
      })
      .catch(() => setFailed(true))
  }, [user?.isAdmin])

  if (user?.isAdmin) {
    return (
      <PageShell>
        <EmptyState icon={Lock} title="For curators" description="This is where curators manage how they're credited. Your account settings are on the main dashboard." />
      </PageShell>
    )
  }
  if (failed) return <LoadError title="Couldn't load your account" message="Refresh to try again." />
  if (!profile) {
    return (
      <PageShell>
        <div className="space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </PageShell>
    )
  }

  const nameDirty = firstName.trim() !== profile.firstName || lastName.trim() !== profile.lastName
  // The preview follows what's typed, so they can see it before saving.
  const draft = { ...profile, firstName: firstName.trim() || profile.firstName, lastName: lastName.trim() || profile.lastName }

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    setSavingName(true)
    setNameError(null)
    try {
      const res = await fetch("/api/curators/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setNameError(Object.values(data.fields ?? {})[0] as string ?? data.error ?? "Couldn't save your name.")
        return
      }
      setProfile(data.profile)
      refresh()
      toast.success("Name saved")
    } finally {
      setSavingName(false)
    }
  }

  async function upload(file: File) {
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/curators/profile/avatar", { method: "POST", body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return toast.error(data.error || "The upload didn't work.")
      setProfile((p) => (p ? { ...p, profilePicture: data.profilePicture } : p))
      refresh()
      toast.success("Photo updated")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function removePhoto() {
    setUploading(true)
    try {
      const res = await fetch("/api/curators/profile/avatar", { method: "DELETE" })
      if (!res.ok) return toast.error("Couldn't remove your photo.")
      setProfile((p) => (p ? { ...p, profilePicture: null } : p))
      refresh()
    } finally {
      setUploading(false)
    }
  }

  async function setAttribution(show: boolean) {
    const previous = profile.showAttribution
    setProfile((p) => (p ? { ...p, showAttribution: show } : p))
    setSavingAttribution(true)
    try {
      const res = await fetch("/api/curators/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showAttribution: show }),
      })
      if (!res.ok) throw new Error()
      toast.success(show ? "Your name will show on your work" : "You're anonymous to students now")
    } catch {
      setProfile((p) => (p ? { ...p, showAttribution: previous } : p))
      toast.error("Couldn't change that. Try again.")
    } finally {
      setSavingAttribution(false)
    }
  }

  const credentials = profile.credentials.filter((c) => c !== "none")

  return (
    <PageShell>
      <PageHeader title="Account" description="Your profile, and how you're credited on the work students see." />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Panel title="Profile">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="flex items-center gap-4 sm:flex-col sm:items-center">
                <div className="relative">
                  <Avatar className="h-20 w-20 ring-1 ring-border">
                    {profile.profilePicture && <AvatarImage src={profile.profilePicture} alt="" className="object-cover" />}
                    <AvatarFallback className="bg-primary/10 text-xl font-semibold text-foreground">{initials(profile)}</AvatarFallback>
                  </Avatar>
                  {uploading && (
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
                      <Loader2 className="h-5 w-5 animate-spin text-foreground" aria-hidden="true" />
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-center">
                  <input
                    ref={fileRef}
                    id={`${uid}-photo`}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
                  />
                  <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                    {profile.profilePicture ? "Change" : "Add photo"}
                  </Button>
                  {profile.profilePicture && (
                    <Button type="button" variant="ghost" size="sm" className="h-9 gap-1.5 text-muted-foreground" disabled={uploading} onClick={removePhoto}>
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>

              <form onSubmit={saveName} className="min-w-0 flex-1 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`${uid}-first`}>First name</Label>
                    <Input id={`${uid}-first`} autoComplete="given-name" className="h-10" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`${uid}-last`}>Last name</Label>
                    <Input id={`${uid}-last`} autoComplete="family-name" className="h-10" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                </div>
                {nameError && (
                  <p role="alert" className="text-sm text-destructive">
                    {nameError}
                  </p>
                )}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">A clear, square photo works best. JPG, PNG or WebP, up to 5 MB.</p>
                  <Button type="submit" className="h-10 shrink-0" disabled={!nameDirty || savingName}>
                    {savingName && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />}
                    Save
                  </Button>
                </div>
              </form>
            </div>
          </Panel>

          <Panel title="Attribution">
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-1">
                <Label htmlFor={`${uid}-attribution`} className="text-sm font-medium text-foreground">
                  Show my name on my work
                </Label>
                <p id={`${uid}-attribution-hint`} className="text-sm text-muted-foreground">
                  Students see your name and photo on the lessons and courses you write, and your name under your exam questions. Turn it off to stay anonymous. It doesn’t change your royalties.
                </p>
              </div>
              <Switch
                id={`${uid}-attribution`}
                checked={profile.showAttribution}
                disabled={savingAttribution}
                onCheckedChange={setAttribution}
                aria-describedby={`${uid}-attribution-hint`}
              />
            </div>
          </Panel>

          <Panel title="Sign-in details">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd className="mt-0.5 truncate text-sm text-foreground">{profile.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Mobile, for sign-in codes</dt>
                <dd className="mt-0.5 text-sm text-foreground" data-tabular>
                  {formatMobile(profile.phone)}
                </dd>
              </div>
              {credentials.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Background</dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">
                    {credentials.map((c) => (
                      <span key={c} className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs text-foreground">
                        {credentialLabel(c)}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">
              Need to change these?{" "}
              <a href="mailto:hello@aviprep.com.au" className="font-medium text-primary hover:underline">
                Email us
              </a>
            </p>
          </Panel>
        </div>

        <Preview profile={draft} />
      </div>
    </PageShell>
  )
}
