"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Pencil } from "lucide-react"
import { useGoogleReCaptcha } from "react-google-recaptcha-v3"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { OtpInput, ResendCode } from "@/components/auth/otp"
import { cn } from "@lib/utils"

const digits = (v: string) => v.replace(/\D/g, "")

function formatPhone(value: string) {
  const d = digits(value).slice(0, 10)
  if (d.length <= 4) return d
  if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`
}

/**
 * Waitlist sign-up: email + Australian mobile, then the texted code.
 * `id` keeps field ids unique when the form appears more than once on a page.
 */
export function WaitlistForm({ id = "waitlist", className }: { id?: string; className?: string }) {
  const { executeRecaptcha } = useGoogleReCaptcha()
  const [stage, setStage] = useState<"details" | "code" | "done">("details")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [challenge, setChallenge] = useState<string | null>(null)
  const [maskedPhone, setMaskedPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [field, setField] = useState<"email" | "phone" | "code" | null>(null)

  async function start(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setField(null)
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setField("email")
      return setError("Enter a valid email address.")
    }
    if (!/^(\+?61|0)4\d{8}$/.test(digits(phone).replace(/^61/, "0"))) {
      setField("phone")
      return setError("Enter an Australian mobile, starting 04.")
    }
    if (!executeRecaptcha) return setError("Still loading. Try again in a second.")

    setLoading(true)
    try {
      const token = await executeRecaptcha("waitlist_join")
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone: digits(phone), token }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setField(data.field ?? null)
        return setError(data.error || "Something went wrong.")
      }
      setChallenge(data.challenge)
      setMaskedPhone(data.maskedPhone)
      setCode("")
      setStage("code")
    } catch {
      setError("Couldn't reach the server. Check your connection.")
    } finally {
      setLoading(false)
    }
  }

  async function confirm(value = code) {
    if (value.length !== 6) {
      setField("code")
      return setError("Enter the 6-digit code.")
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge, code: value }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.restart) setStage("details")
        setField("code")
        setCode("")
        return setError(data.error || "That code isn't right.")
      }
      setStage("done")
    } catch {
      setError("Couldn't reach the server. Check your connection.")
    } finally {
      setLoading(false)
    }
  }

  if (stage === "done") {
    return (
      <div role="status" className={cn("flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4", className)}>
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
        <div>
          <p className="font-semibold text-foreground">You&apos;re on the list.</p>
          <p className="text-sm text-muted-foreground">
            We&apos;ll email {email.trim()} when we launch, with your early-access discount.
          </p>
        </div>
      </div>
    )
  }

  if (stage === "code") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          confirm()
        }}
        className={cn("space-y-4 text-left", className)}
        noValidate
      >
        <p className="text-sm text-muted-foreground">
          Enter the code we texted to <span className="font-medium text-foreground">{maskedPhone}</span>.{" "}
          <button
            type="button"
            onClick={() => {
              setStage("details")
              setError(null)
            }}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            <Pencil className="h-3 w-3" aria-hidden="true" />
            Change
          </button>
        </p>
        <Label htmlFor={`${id}-otp`} className="sr-only">
          Code
        </Label>
        <OtpInput
          id={`${id}-otp`}
          value={code}
          onChange={(v) => {
            setCode(v)
            setError(null)
          }}
          onComplete={(v) => confirm(v)}
          error={field === "code" ? error : null}
          disabled={loading}
        />
        <Button type="submit" size="lg" className="h-12 w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          {loading ? "Checking..." : "Confirm and join"}
        </Button>
        <ResendCode
          challenge={challenge}
          onError={(message, restart) => {
            if (restart) setStage("details")
            setField("code")
            setError(message)
          }}
          className="text-center"
        />
      </form>
    )
  }

  return (
    <form onSubmit={start} className={cn("space-y-3 text-left", className)} noValidate>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-email`} className="text-sm">
            Email
          </Label>
          <Input
            id={`${id}-email`}
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(null)
            }}
            aria-invalid={field === "email" ? true : undefined}
            className="h-12 bg-background"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-phone`} className="text-sm">
            Mobile
          </Label>
          <Input
            id={`${id}-phone`}
            type="tel"
            autoComplete="tel-national"
            inputMode="tel"
            placeholder="04XX XXX XXX"
            value={phone}
            maxLength={12}
            onChange={(e) => {
              setPhone(formatPhone(e.target.value))
              setError(null)
            }}
            aria-invalid={field === "phone" ? true : undefined}
            className="h-12 bg-background"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="h-12 w-full gap-2 text-base" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {loading ? "Sending code..." : "Join the waitlist"}
        {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
      </Button>

      <p className="text-xs text-muted-foreground">
        We&apos;ll text a code to confirm your mobile. By joining you agree to our{" "}
        <Link href="/terms" className="underline hover:text-foreground">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </Link>
        . No spam.
      </p>
    </form>
  )
}
