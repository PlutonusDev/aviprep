"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2, MessageSquareText } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { OtpInput, ResendCode } from "@/components/auth/otp"

const HOME = "/admin"

/** Only studio paths, so ?redirect= can't send anyone elsewhere. */
function safeRedirect(value: string | null) {
  return value && (value === "/admin" || value.startsWith("/admin/")) ? value : HOME
}

export function CuratorLoginForm() {
  const searchParams = useSearchParams()
  const [stage, setStage] = useState<"password" | "code">("password")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [code, setCode] = useState("")
  const [challenge, setChallenge] = useState<string | null>(null)
  const [maskedPhone, setMaskedPhone] = useState("")
  const [resendWait, setResendWait] = useState(60)
  const [error, setError] = useState<string | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const errorRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  function backToPassword(message?: string) {
    setStage("password")
    setCode("")
    setCodeError(null)
    setChallenge(null)
    setError(message ?? null)
    requestAnimationFrame(() => headingRef.current?.focus())
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/curators/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || "Couldn't sign you in.")
        return
      }
      setChallenge(data.challenge)
      setMaskedPhone(data.maskedPhone)
      setResendWait(data.retryAfter ?? 60)
      setStage("code")
    } catch {
      setError("Couldn't reach AviPrep. Check your connection.")
    } finally {
      setLoading(false)
    }
  }

  async function submitCode(value = code) {
    if (loading) return
    setLoading(true)
    setCodeError(null)
    try {
      const res = await fetch("/api/curators/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge, code: value }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.restart) backToPassword(data.error)
        else setCodeError(data.error || "That code didn't work.")
        setLoading(false)
        return
      }
      // A full load, so the studio starts with the new session.
      window.location.assign(safeRedirect(searchParams.get("redirect")))
    } catch {
      setCodeError("Couldn't reach AviPrep. Check your connection.")
      setLoading(false)
    }
  }

  return (
    <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-e1">
      {stage === "password" ? (
        <>
          <CardHeader className="space-y-1.5 p-6 pb-5 sm:p-8 sm:pb-6">
            <h1 ref={headingRef} tabIndex={-1} className="font-heading text-2xl font-bold tracking-tight outline-none">
              Welcome back
            </h1>
            <CardDescription>Sign in to the content studio.</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
            <form onSubmit={submitPassword} className="space-y-5">
              {error && (
                <Alert variant="destructive" ref={errorRef} tabIndex={-1}>
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  className="h-11"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError(null)
                  }}
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="h-11 pr-11"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setError(null)
                    }}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <Button type="submit" size="lg" className="h-11 w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Checking...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">We’ll text a code to your mobile to finish signing in.</p>
            </form>
          </CardContent>
        </>
      ) : (
        <>
          <CardHeader className="space-y-1.5 p-6 pb-5 sm:p-8 sm:pb-6">
            <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
              <MessageSquareText className="h-5 w-5 text-primary" aria-hidden="true" />
            </span>
            <h1 className="font-heading text-2xl font-bold tracking-tight">Check your phone</h1>
            <CardDescription>
              We texted a 6-digit code to <span className="font-medium text-foreground">{maskedPhone}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                submitCode()
              }}
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label htmlFor="otp">Code</Label>
                <OtpInput
                  value={code}
                  onChange={(v) => {
                    setCode(v)
                    setCodeError(null)
                  }}
                  onComplete={(v) => submitCode(v)}
                  error={codeError}
                  disabled={loading}
                />
              </div>
              <Button type="submit" size="lg" className="h-11 w-full" disabled={loading || code.length < 6}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
              <ResendCode
                challenge={challenge}
                initialWait={resendWait}
                onError={(message, restart) => (restart ? backToPassword(message) : setCodeError(message))}
                className="text-center"
              />
            </form>
          </CardContent>
        </>
      )}

      <CardFooter className="border-t border-border bg-muted/30 px-6 py-4 sm:px-8">
        {stage === "code" ? (
          <button
            type="button"
            onClick={() => backToPassword()}
            className="mx-auto flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Use a different account
          </button>
        ) : (
          <p className="w-full text-center text-sm text-muted-foreground">
            Forgotten your password or need access?{" "}
            <a href="mailto:hello@aviprep.com.au" className="font-medium text-primary hover:underline">
              Email us
            </a>
          </p>
        )}
      </CardFooter>
    </Card>
  )
}
