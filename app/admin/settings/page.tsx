"use client"

import { useEffect, useState } from "react"
import { Loader2, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

interface Registration {
  open: boolean
  message: string
}

export default function SiteSettingsPage() {
  const [saved, setSaved] = useState<Registration | null>(null)
  const [draft, setDraft] = useState<Registration>({ open: true, message: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setSaved(d.registration)
        setDraft(d.registration)
      })
      .catch(() => setError(true))
  }, [])

  const dirty = !!saved && (saved.open !== draft.open || saved.message !== draft.message)

  async function save() {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration: draft }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error)
      setSaved(data.registration)
      setDraft(data.registration)
      toast.success(data.registration.open ? "Registrations are open" : "Registrations are closed")
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Couldn't save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 p-4 lg:p-8">
      <header className="space-y-1.5">
        <h1 className="text-display-3 font-bold text-foreground">Site settings</h1>
        <p className="text-muted-foreground">Switches that apply across the whole site.</p>
      </header>

      <section aria-labelledby="registration-title">
        <h2 id="registration-title" className="mb-3 text-base font-semibold text-foreground">
          Registrations
        </h2>
        <Card className="shadow-e1">
          <CardContent className="divide-y divide-border p-0">
            {error ? (
              <p className="p-5 text-sm text-destructive">Couldn&apos;t load settings. Refresh to try again.</p>
            ) : !saved ? (
              <div className="space-y-3 p-5">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-72" />
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4 p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" />
                    </span>
                    <div>
                      <Label htmlFor="registrations-open" className="font-medium text-foreground">
                        Allow new registrations
                      </Label>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        When off, the sign-up page shows a closed notice and the server rejects new accounts. Existing
                        members can still sign in, and schools can still add students.
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="registrations-open"
                    checked={draft.open}
                    onCheckedChange={(open) => setDraft((d) => ({ ...d, open }))}
                  />
                </div>

                <div className="space-y-2 p-5">
                  <Label htmlFor="closed-message">Message while closed</Label>
                  <Textarea
                    id="closed-message"
                    value={draft.message}
                    maxLength={500}
                    rows={3}
                    placeholder="We're not taking new sign-ups right now. Please check back soon."
                    onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Optional. Leave blank to use the default above.</p>
                </div>

                <div className="flex items-center justify-end gap-3 bg-muted/30 px-5 py-3">
                  {dirty && <span className="text-sm text-muted-foreground">Unsaved changes</span>}
                  <Button onClick={save} disabled={!dirty || saving} className="h-10 gap-2">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    Save
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
