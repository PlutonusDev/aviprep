"use client"

import type React from "react"
import { useState } from "react"
import { AlertCircle, CheckCircle2, Loader2, Mail, Send } from "lucide-react"
import { useGoogleReCaptcha } from "react-google-recaptcha-v3"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/** Partnership enquiry for flight schools and RTOs. Posts to /api/rto-contact. */
export function RtoForm() {
  const { executeRecaptcha } = useGoogleReCaptcha()
  const [values, setValues] = useState({ name: "", organisation: "", email: "", phone: "" })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }))
    setError(null)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!values.name.trim() || !values.organisation.trim()) return setError("Add your name and organisation.")
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email.trim())) return setError("Enter a valid email address.")
    if (!executeRecaptcha) return setError("Still loading. Try again in a second.")

    setLoading(true)
    setError(null)
    try {
      const token = await executeRecaptcha("rto_contact")
      const res = await fetch("/api/rto-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, token }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return setError(data.error || "Something went wrong.")
      setDone(true)
    } catch {
      setError("Couldn't reach the server. Check your connection.")
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div role="status" className="flex h-full flex-col items-center justify-center py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
          <CheckCircle2 className="h-6 w-6 text-success" aria-hidden="true" />
        </span>
        <p className="mt-4 text-lg font-semibold text-foreground">Thanks, {values.name.split(" ")[0]}.</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Our partnerships team will be in touch within two business days.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="rto-name">Your name</Label>
          <Input id="rto-name" autoComplete="name" value={values.name} onChange={set("name")} className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rto-org">Organisation</Label>
          <Input id="rto-org" autoComplete="organization" value={values.organisation} onChange={set("organisation")} className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rto-email">Work email</Label>
          <Input id="rto-email" type="email" autoComplete="email" value={values.email} onChange={set("email")} className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rto-phone">
            Phone <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input id="rto-phone" type="tel" autoComplete="tel" value={values.phone} onChange={set("phone")} className="h-11" />
        </div>
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button type="submit" size="lg" className="h-11 gap-2" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          {loading ? "Sending..." : "Talk to our team"}
        </Button>
        <a
          href="mailto:partnerships@aviprep.com.au"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          partnerships@aviprep.com.au
        </a>
      </div>
    </form>
  )
}
