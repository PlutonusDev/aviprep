"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Camera,
  Check,
  Compass,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ImageCropper } from "@/components/hub/image-cropper"
import { PageHeader, PageShell } from "@/components/hub/page-primitives"
import { UserAvatar } from "@/components/forum/forum-ui"
import { useTenant } from "@lib/tenant-context"
import { useUser } from "@lib/user-context"
import { cn } from "@lib/utils"

const SUPPORT_EMAIL = "support@aviprep.com.au"

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "billing", label: "Access & billing", icon: CreditCard },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "help", label: "Help", icon: Compass },
] as const

const dateFmt = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })

function daysUntil(d: string | Date) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000)
}

/* --- Layout pieces ------------------------------------------------------------ */

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <div className="mb-3">
        <h2 id={`${id}-title`} className="text-base font-semibold text-foreground">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      <Card className="overflow-hidden shadow-e1">
        <CardContent className="divide-y divide-border p-0">{children}</CardContent>
      </Card>
    </section>
  )
}

/** One setting: label and detail on the left, value or action on the right. */
function Row({
  label,
  detail,
  children,
}: {
  label: string
  detail?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="min-w-0">
        <p className="font-medium text-foreground">{label}</p>
        {detail && <div className="mt-0.5 text-sm text-muted-foreground [overflow-wrap:anywhere]">{detail}</div>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  )
}

/* --- Page --------------------------------------------------------------------- */

export default function SettingsContent() {
  const { user } = useUser()
  const [active, setActive] = useState<string>("profile")

  // Highlight the section in view.
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[]
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: "-96px 0px -55% 0px" },
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [user])

  return (
    <PageShell>
      <PageHeader title="Settings" description="Your account, access and security." />

      <div className="grid gap-8 lg:grid-cols-[13rem_1fr]">
        <nav aria-label="Settings sections" className="lg:sticky lg:top-24 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {SECTIONS.map((s) => (
              <li key={s.id} className="shrink-0">
                <a
                  href={`#${s.id}`}
                  aria-current={active === s.id ? "true" : undefined}
                  onClick={() => setActive(s.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active === s.id
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <s.icon className="h-4 w-4" aria-hidden="true" />
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 max-w-3xl space-y-10">
          <ProfileSection />
          <BillingSection />
          <SecuritySection />
          <HelpSection />
        </div>
      </div>
    </PageShell>
  )
}

/* --- Profile -------------------------------------------------------------------- */

function ProfileSection() {
  const { user, refresh } = useUser()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [image, setImage] = useState<string | null>(null)
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null)
  const [error, setError] = useState<string | null>(null)

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      return setError("Use a JPG, PNG, WebP or GIF.")
    }
    if (file.size > 5 * 1024 * 1024) return setError("That image is over 5MB.")
    setError(null)
    setImage(URL.createObjectURL(file))
  }

  function closeCropper() {
    if (image) URL.revokeObjectURL(image)
    setImage(null)
  }

  async function savePicture(profilePicture: string | null) {
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profilePicture }),
    })
    if (!res.ok) throw new Error()
    await refresh()
  }

  async function upload(blob: Blob) {
    closeCropper()
    setBusy("upload")
    setError(null)
    try {
      const form = new FormData()
      form.append("file", new File([blob], "avatar.jpg", { type: "image/jpeg" }))
      const res = await fetch("/api/upload", { method: "POST", body: form })
      if (!res.ok) throw new Error()
      const { url } = await res.json()
      await savePicture(url)
      toast.success("Photo updated")
    } catch {
      setError("Couldn't upload that photo. Try again.")
    } finally {
      setBusy(null)
    }
  }

  async function remove() {
    setBusy("remove")
    try {
      await savePicture(null)
      toast.success("Photo removed")
    } catch {
      setError("Couldn't remove your photo.")
    } finally {
      setBusy(null)
    }
  }

  const changeRequest = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Update my account details")}`

  return (
    <Section id="profile" title="Profile" description="Shown on your forum posts and messages.">
      {image && <ImageCropper open onClose={closeCropper} imageSrc={image} onCropComplete={upload} />}

      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!!busy}
          className="group relative h-20 w-20 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Change photo"
        >
          <UserAvatar firstName={user?.firstName} lastName={user?.lastName} src={user?.profilePicture} className="h-20 w-20 text-xl" />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            {busy === "upload" ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden="true" />
            ) : (
              <Camera className="h-5 w-5 text-white" aria-hidden="true" />
            )}
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="h-9" onClick={() => fileInputRef.current?.click()} disabled={!!busy}>
              {busy === "upload" ? "Uploading..." : user?.profilePicture ? "Change photo" : "Add photo"}
            </Button>
            {user?.profilePicture && (
              <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={remove} disabled={!!busy}>
                {busy === "remove" ? "Removing..." : "Remove"}
              </Button>
            )}
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={pickFile}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-4 p-4 sm:grid-cols-2 sm:p-5">
        {[
          { label: "First name", value: user?.firstName },
          { label: "Last name", value: user?.lastName },
          { label: "Email", value: user?.email },
          { label: "Phone", value: user?.phone },
          { label: "ARN", value: user?.arn },
          { label: "Member since", value: user?.createdAt ? dateFmt(user.createdAt) : undefined },
        ].map((f) => (
          <div key={f.label} className="min-w-0">
            <dt className="text-xs font-medium text-muted-foreground">{f.label}</dt>
            <dd className="mt-0.5 truncate text-sm text-foreground" title={f.value ?? undefined}>
              {f.value || "—"}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex items-center justify-between gap-3 bg-muted/30 px-4 py-3 text-sm text-muted-foreground sm:px-5">
        <span>These are tied to your CASA details, so changes go through support.</span>
        <a href={changeRequest} className="shrink-0 font-medium text-primary hover:underline">
          Request a change
        </a>
      </div>
    </Section>
  )
}

/* --- Access & billing ------------------------------------------------------------ */

function BillingSection() {
  const { user, purchases } = useUser()
  const { tenant, isWhitelabeled } = useTenant()
  const [opening, setOpening] = useState(false)

  const now = Date.now()
  const bundleActive = !!(user?.hasBundle && user.bundleExpiry && new Date(user.bundleExpiry).getTime() > now)
  const active = purchases
    .filter((p) => new Date(p.expiresAt).getTime() > now)
    .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())
  const hasPaid = bundleActive || active.length > 0

  async function openPortal() {
    setOpening(true)
    try {
      const res = await fetch("/api/user/billing-portal", { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) throw new Error(data.error)
      window.location.assign(data.url)
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Couldn't open billing. Try again.")
      setOpening(false)
    }
  }

  return (
    <Section id="billing" title="Access & billing">
      {isWhitelabeled && (
        <Row
          label={`Provided by ${tenant?.name ?? "your school"}`}
          detail="Your school chooses which subjects you can study."
        >
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link href="/dashboard/exams">View subjects</Link>
          </Button>
        </Row>
      )}

      {bundleActive && (
        <Row
          label="All-subject bundle"
          detail={<ExpiryText date={user!.bundleExpiry!} />}
        >
          <Badge>Every subject</Badge>
        </Row>
      )}

      {!bundleActive &&
        active.map((p) => (
          <Row key={p.id} label={p.subjectName} detail={<ExpiryText date={p.expiresAt} />}>
            <Badge variant="outline">{p.subjectCode}</Badge>
          </Row>
        ))}

      {!hasPaid && !isWhitelabeled && (
        <Row label="No active subjects" detail="Pick a subject to unlock its lessons and exams.">
          <Button asChild size="sm" className="h-9">
            <Link href="/dashboard/pricing">See subjects</Link>
          </Button>
        </Row>
      )}

      {hasPaid && !isWhitelabeled && (
        <Row label="Payment details" detail="Update your card, get invoices or cancel a subscription.">
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={openPortal} disabled={opening}>
            {opening ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />}
            Manage billing
          </Button>
        </Row>
      )}
    </Section>
  )
}

function ExpiryText({ date }: { date: string | Date }) {
  const days = daysUntil(date)
  if (days <= 14) {
    return (
      <span className="text-foreground">
        <span className="font-medium text-warning">Ends in {days} {days === 1 ? "day" : "days"}</span> &middot; {dateFmt(date)}
      </span>
    )
  }
  return <>Access until {dateFmt(date)}</>
}

/* --- Security ------------------------------------------------------------------- */

function SecuritySection() {
  const [open, setOpen] = useState(false)
  const closeRequest = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Close my account")}`

  return (
    <Section id="security" title="Security">
      <Row label="Password" detail="Use at least 8 characters.">
        <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setOpen(true)}>
          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
          Change password
        </Button>
      </Row>
      <Row label="Close account" detail="We'll delete your account and study history. This can't be undone.">
        <Button asChild variant="ghost" size="sm" className="h-9 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive">
          <a href={closeRequest}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Request closure
          </a>
        </Button>
      </Row>
      <PasswordDialog open={open} onOpenChange={setOpen} />
    </Section>
  )
}

type PasswordField = "oldPassword" | "newPassword" | "confirmPassword"

function PasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [values, setValues] = useState<Record<PasswordField, string>>({ oldPassword: "", newPassword: "", confirmPassword: "" })
  const [errors, setErrors] = useState<Partial<Record<PasswordField, string>>>({})
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      setValues({ oldPassword: "", newPassword: "", confirmPassword: "" })
      setErrors({})
      setShow(false)
    }
  }, [open])

  const set = (field: PasswordField) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }))
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!values.oldPassword) next.oldPassword = "Enter your current password"
    if (values.newPassword.length < 8) next.newPassword = "Use at least 8 characters"
    if (values.confirmPassword !== values.newPassword) next.confirmPassword = "Passwords don't match"
    setErrors(next)
    if (Object.keys(next).length) {
      document.getElementById(Object.keys(next)[0])?.focus()
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/auth/update-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword: values.oldPassword, newPassword: values.newPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const field: PasswordField = data.field ?? "oldPassword"
        setErrors({ [field]: data.error || "Couldn't update your password" })
        document.getElementById(field)?.focus()
        return
      }
      toast.success("Password changed")
      onOpenChange(false)
    } catch {
      toast.error("Couldn't update your password. Check your connection.")
    } finally {
      setSaving(false)
    }
  }

  const field = (id: PasswordField, label: string, autoComplete: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        value={values[id]}
        onChange={set(id)}
        aria-invalid={!!errors[id]}
        aria-describedby={errors[id] ? `${id}-error` : undefined}
        className="h-10"
      />
      {errors[id] && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {errors[id]}
        </p>
      )}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>You&apos;ll stay signed in on this device.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-5">
            {field("oldPassword", "Current password", "current-password")}
            {field("newPassword", "New password", "new-password")}
            {field("confirmPassword", "Confirm new password", "new-password")}
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-pressed={show}
              className="flex items-center gap-1.5 rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              {show ? "Hide passwords" : "Show passwords"}
            </button>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
              Update password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* --- Help ----------------------------------------------------------------------- */

function HelpSection() {
  const router = useRouter()
  const [starting, setStarting] = useState(false)

  function replayTour() {
    setStarting(true)
    // Clear the local guard too, or it would block the replay even after the
    // server flag is reset.
    try {
      window.localStorage?.removeItem("aviprep:toured")
    } catch {
      // Storage may be unavailable.
    }
    // The tour only mounts on the dashboard, so reset the flag and go there.
    fetch("/api/user/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reset: true }),
    }).finally(() => router.push("/dashboard"))
  }

  return (
    <Section id="help" title="Help">
      <Row label="Product tour" detail="A quick walk through subjects, lessons, exams and results.">
        <Button variant="outline" size="sm" className="h-9" onClick={replayTour} disabled={starting}>
          {starting ? "Starting..." : "Replay tour"}
        </Button>
      </Row>
      <Row label="Contact support" detail={SUPPORT_EMAIL}>
        <Button asChild variant="outline" size="sm" className="h-9 gap-1.5">
          <a href={`mailto:${SUPPORT_EMAIL}`}>
            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
            Email us
          </a>
        </Button>
      </Row>
    </Section>
  )
}
