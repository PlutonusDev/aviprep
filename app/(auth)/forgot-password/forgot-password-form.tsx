"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AlertCircle, ArrowLeft, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { OtpInput, ResendCode } from "@/components/auth/otp"

export default function ForgotPasswordForm() {
  const router = useRouter()
  const [stage, setStage] = useState<"email" | "reset">("email")
  const [email, setEmail] = useState("")
  const [challenge, setChallenge] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ code?: string; password?: string; confirm?: string }>({})

  async function requestCode(e: React.FormEvent) {
    e.preventDefault()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError("Enter a valid email address.")
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return setError(data.error || "Couldn't start the reset.")
      setChallenge(data.challenge)
      setStage("reset")
    } catch {
      setError("Couldn't reach the server. Check your connection.")
    } finally {
      setLoading(false)
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault()
    const errors: typeof fieldErrors = {}
    if (code.length !== 6) errors.code = "Enter the 6-digit code."
    if (password.length < 8) errors.password = "Use at least 8 characters."
    if (confirm !== password) errors.confirm = "Passwords don't match."
    setFieldErrors(errors)
    if (Object.keys(errors).length) {
      document.getElementById(errors.code ? "otp" : errors.password ? "new-password" : "confirm-password")?.focus()
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge, code, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.restart) {
          setStage("email")
          return setError(data.error)
        }
        if (data.field === "code") {
          setCode("")
          return setFieldErrors({ code: data.error })
        }
        if (data.field === "password") return setFieldErrors({ password: data.error })
        return setError(data.error || "Couldn't reset your password.")
      }
      router.push("/login?reset=1")
    } catch {
      setError("Couldn't reach the server. Check your connection.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-e1">
      <CardHeader className="space-y-1.5 p-6 pb-5 sm:p-8 sm:pb-6">
        <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
          <KeyRound className="h-5 w-5 text-primary" aria-hidden="true" />
        </span>
        <h1 className="font-heading text-2xl font-bold tracking-tight">{stage === "email" ? "Reset your password" : "Check your phone"}</h1>
        <CardDescription>
          {stage === "email"
            ? "Enter your account email and we'll text a code to the mobile on it."
            : "If there's an account for that email, we've texted a code to its mobile."}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
        {error && (
          <Alert variant="destructive" className="mb-5">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {stage === "email" ? (
          <form onSubmit={requestCode} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError(null)
                }}
                placeholder="pilot@example.com"
                className="h-11"
                disabled={loading}
              />
            </div>
            <Button type="submit" size="lg" className="h-11 w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {loading ? "Sending..." : "Text me a code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="space-y-5" noValidate>
            {/* Lets password managers attach the new password to the right account. */}
            <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />

            <div className="space-y-2">
              <Label htmlFor="otp">Code</Label>
              <OtpInput
                value={code}
                onChange={(v) => {
                  setCode(v)
                  setFieldErrors((f) => ({ ...f, code: undefined }))
                }}
                onComplete={() => document.getElementById("new-password")?.focus()}
                error={fieldErrors.code}
                disabled={loading}
              />
              <ResendCode
                challenge={challenge}
                onError={(message, restart) => {
                  if (restart) {
                    setStage("email")
                    setError(message)
                  } else {
                    setFieldErrors((f) => ({ ...f, code: message }))
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setFieldErrors((f) => ({ ...f, password: undefined }))
                  }}
                  aria-invalid={fieldErrors.password ? true : undefined}
                  aria-describedby={fieldErrors.password ? "new-password-error" : "new-password-hint"}
                  className="h-11 pr-11"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              {fieldErrors.password ? (
                <p id="new-password-error" className="text-sm text-destructive">
                  {fieldErrors.password}
                </p>
              ) : (
                <p id="new-password-hint" className="text-xs text-muted-foreground">
                  At least 8 characters. Signs out other remembered devices.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value)
                  setFieldErrors((f) => ({ ...f, confirm: undefined }))
                }}
                aria-invalid={fieldErrors.confirm ? true : undefined}
                aria-describedby={fieldErrors.confirm ? "confirm-password-error" : undefined}
                className="h-11"
                disabled={loading}
              />
              {fieldErrors.confirm && (
                <p id="confirm-password-error" className="text-sm text-destructive">
                  {fieldErrors.confirm}
                </p>
              )}
            </div>

            <Button type="submit" size="lg" className="h-11 w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {loading ? "Saving..." : "Set new password"}
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="border-t border-border bg-muted/30 px-6 py-4 sm:px-8">
        {stage === "reset" ? (
          <button
            type="button"
            onClick={() => {
              setStage("email")
              setCode("")
              setFieldErrors({})
            }}
            className="mx-auto flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Use a different email
          </button>
        ) : (
          <p className="w-full text-center text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        )}
      </CardFooter>
    </Card>
  )
}
