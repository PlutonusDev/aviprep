"use client"

import type React from "react"
import { useEffect, useId, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Check,
  CircleCheck,
  Circle,
  Eye,
  EyeOff,
  Link2Off,
  Loader2,
  Lock,
  MessageSquareText,
  PenLine,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { OtpInput, ResendCode } from "@/components/auth/otp"
import {
  CREDENTIALS,
  CREDENTIALS_ERROR,
  PASSWORD_MIN,
  checkDetails,
  checkPassword,
  toggleCredential,
  type DetailErrors,
} from "@lib/curators/details"
import { cn } from "@lib/utils"

const GUIDELINES_HREF = "/api/curators/guidelines"

type Stage = "details" | "code" | "done"

/* --- Shared pieces --------------------------------------------------------- */

function Steps({ stage }: { stage: Stage }) {
  const steps = [
    { id: "details", label: "Your details" },
    { id: "code", label: "Confirm mobile" },
  ] as const
  const index = stage === "details" ? 0 : stage === "code" ? 1 : 2
  return (
    <ol className="mb-4 flex items-center gap-3 px-1" aria-label="Progress">
      {steps.map((step, i) => {
        const done = i < index
        const current = i === index
        return (
          <li key={step.id} className="flex flex-1 flex-col gap-2" aria-current={current ? "step" : undefined}>
            <span className={cn("h-1 rounded-full transition-colors duration-300", done || current ? "bg-primary" : "bg-border")} />
            <span className={cn("flex items-center gap-1.5 text-xs font-medium", current ? "text-foreground" : "text-muted-foreground")}>
              {done && <Check className="h-3 w-3 text-primary" aria-hidden="true" />}
              {step.label}
              {done && <span className="sr-only">(done)</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function FieldMessage({ id, error, hint }: { id: string; error?: string; hint?: React.ReactNode }) {
  if (error) {
    return (
      <p id={`${id}-error`} className="flex items-start gap-1.5 text-xs text-destructive">
        <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {error}
      </p>
    )
  }
  return hint ? (
    <p id={`${id}-hint`} className="text-xs text-muted-foreground">
      {hint}
    </p>
  ) : null
}

export function InviteProblem({ title, message, signIn = false }: { title: string; message: string; signIn?: boolean }) {
  return (
    <Card className="overflow-hidden rounded-xl border border-border bg-card text-center shadow-e1">
      <CardContent className="flex flex-col items-center px-6 pb-8 pt-10 sm:px-10">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Link2Off className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-heading text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-7 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          {signIn ? (
            <Button asChild className="h-11">
              <a href="/login">Sign in</a>
            </Button>
          ) : (
            <Button asChild variant="outline" className="h-11">
              <a href="mailto:hello@aviprep.com.au">Email the AviPrep team</a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/* --- The flow -------------------------------------------------------------- */

export function JoinFlow({
  token,
  email,
  inviterName,
  note,
  expiresAt,
  prefill,
}: {
  token: string
  email: string
  inviterName: string
  note: string | null
  expiresAt: string
  prefill: { firstName: string; lastName: string; phone: string }
}) {
  const uid = useId()
  const [stage, setStage] = useState<Stage>("details")
  const [firstName, setFirstName] = useState(prefill.firstName)
  const [lastName, setLastName] = useState(prefill.lastName)
  const [phone, setPhone] = useState(prefill.phone)
  const [credentials, setCredentials] = useState<string[]>([])
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<DetailErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [dead, setDead] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [challenge, setChallenge] = useState<string | null>(null)
  const [maskedPhone, setMaskedPhone] = useState("")
  const [code, setCode] = useState("")
  const [codeError, setCodeError] = useState<string | null>(null)

  const headingRef = useRef<HTMLHeadingElement>(null)
  const formErrorRef = useRef<HTMLDivElement>(null)

  const id = (name: string) => `${uid}-${name}`
  const expires = new Date(expiresAt).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })
  const passwordLongEnough = password.length >= PASSWORD_MIN

  // Errors appear after the first attempt, then update live as they're fixed.
  const liveErrors = useMemo<DetailErrors>(() => {
    const next = checkDetails({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() })
    const passwordError = checkPassword(password, email)
    if (passwordError) next.password = passwordError
    if (!credentials.length) next.credentials = CREDENTIALS_ERROR
    return next
  }, [firstName, lastName, phone, password, credentials, email])
  const shown = submitted ? { ...liveErrors, ...errors } : errors

  useEffect(() => {
    if (formError) formErrorRef.current?.focus()
  }, [formError])

  useEffect(() => {
    // Move focus to the new step's heading so screen readers follow along.
    headingRef.current?.focus()
  }, [stage])

  function clearServerError(field: keyof DetailErrors) {
    setErrors((prev) => ({ ...prev, [field]: undefined }))
    setFormError(null)
  }

  const payload = () => ({ token, firstName, lastName, phone, password, credentials })

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault()
    setSubmitted(true)
    if (Object.keys(liveErrors).length) {
      setFormError("A few details need another look.")
      return
    }
    setLoading(true)
    setFormError(null)
    try {
      const res = await fetch("/api/curators/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.restart) return setDead(data.error)
        setErrors(data.fields ?? {})
        setFormError(data.error || "Couldn't send a code.")
        return
      }
      setChallenge(data.challenge)
      setMaskedPhone(data.maskedPhone)
      setCode("")
      setCodeError(null)
      setStage("code")
    } catch {
      setFormError("Couldn't reach AviPrep. Check your connection.")
    } finally {
      setLoading(false)
    }
  }

  async function finish(value = code) {
    if (loading) return
    setLoading(true)
    setCodeError(null)
    try {
      const res = await fetch("/api/curators/join/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload(), challenge, code: value }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.restart) return setDead(data.error)
        if (data.back) {
          setStage("details")
          setFormError(data.error)
          return
        }
        setCodeError(data.error || "That code didn't work.")
        return
      }
      setStage("done")
    } catch {
      setCodeError("Couldn't reach AviPrep. Check your connection.")
    } finally {
      setLoading(false)
    }
  }

  if (dead) return <InviteProblem title="This invite can't be used" message={dead} signIn={dead.includes("Sign in")} />

  /* --- Done ---------------------------------------------------------------- */
  if (stage === "done") {
    return (
      <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-e1">
        <div className="h-1 bg-primary" />
        <CardContent className="px-6 pb-8 pt-10 sm:px-8">
          <div className="flex flex-col items-center text-center">
            <span className="relative flex h-16 w-16 items-center justify-center">
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-success/15 motion-safe:animate-ping motion-safe:[animation-iteration-count:1] motion-safe:[animation-duration:900ms]"
              />
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-success/10 motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-500">
                <Check className="h-8 w-8 text-success" aria-hidden="true" />
              </span>
            </span>
            <h1 ref={headingRef} tabIndex={-1} className="mt-6 font-heading text-2xl font-bold tracking-tight outline-none">
              You’re in, {firstName.trim()}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Your account is set up and you’re signed in. Here’s where to start.</p>
          </div>

          <ol className="mt-8 space-y-2">
            <li>
              <a
                href={GUIDELINES_HREF}
                target="_blank"
                rel="noopener"
                className="group flex items-center gap-3 rounded-lg border border-border p-3.5 transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <BookOpenText className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">Read the content guidelines</span>
                  <span className="block text-xs text-muted-foreground">Ten minutes that’ll save you a lot of edits</span>
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </a>
            </li>
            <li>
              <a
                href="/admin"
                className="group flex items-center gap-3 rounded-lg border border-border p-3.5 transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <PenLine className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">Write your first question</span>
                  <span className="block text-xs text-muted-foreground">Everything you submit is reviewed before it goes live</span>
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </a>
            </li>
          </ol>

          <Button asChild size="lg" className="mt-6 h-11 w-full">
            <a href="/admin">Open the content studio</a>
          </Button>
        </CardContent>
        <CardFooter className="border-t border-border bg-muted/30 px-6 py-4 sm:px-8">
          <p className="w-full text-center text-xs text-muted-foreground">
            Bookmark <span className="font-medium text-foreground">curators.aviprep.com.au</span> for easy access.
          </p>
        </CardFooter>
      </Card>
    )
  }

  /* --- Code ---------------------------------------------------------------- */
  if (stage === "code") {
    return (
      <>
        <Steps stage={stage} />
        <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-e1">
          <CardHeader className="space-y-1.5 p-6 pb-5 sm:p-8 sm:pb-6">
            <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
              <MessageSquareText className="h-5 w-5 text-primary" aria-hidden="true" />
            </span>
            <h1 ref={headingRef} tabIndex={-1} className="font-heading text-2xl font-bold tracking-tight outline-none">
              Check your phone
            </h1>
            <CardDescription>
              We texted a 6-digit code to <span className="font-medium text-foreground">{maskedPhone}</span>. Enter it to create your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                finish()
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
                  onComplete={(v) => finish(v)}
                  error={codeError}
                  disabled={loading}
                />
              </div>
              <Button type="submit" size="lg" className="h-11 w-full" disabled={loading || code.length < 6}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Creating your account...
                  </>
                ) : (
                  "Create my account"
                )}
              </Button>
              <ResendCode
                challenge={challenge}
                onError={(message, restart) => (restart ? setStage("details") : setCodeError(message))}
                className="text-center"
              />
            </form>
          </CardContent>
          <CardFooter className="border-t border-border bg-muted/30 px-6 py-4 sm:px-8">
            <button
              type="button"
              onClick={() => setStage("details")}
              className="mx-auto flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Wrong number? Go back
            </button>
          </CardFooter>
        </Card>
      </>
    )
  }

  /* --- Details ------------------------------------------------------------- */
  const describe = (name: keyof DetailErrors, hint = false) => (shown[name] ? `${id(name)}-error` : hint ? `${id(name)}-hint` : undefined)

  return (
    <>
      <Steps stage={stage} />
      <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-e1">
        <CardHeader className="space-y-1.5 p-6 pb-5 sm:p-8 sm:pb-6">
          <span className="mb-1 inline-flex w-fit items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-foreground">
            You’re invited
          </span>
          <h1 ref={headingRef} tabIndex={-1} className="font-heading text-2xl font-bold tracking-tight outline-none">
            {prefill.firstName ? `Welcome, ${prefill.firstName}` : "Welcome to the studio"}
          </h1>
          <CardDescription>
            {inviterName} invited you to write for AviPrep. We’ve prefilled some details, please ensure they’re correct.
          </CardDescription>
          {note && (
            <figure className="mt-3 rounded-lg bg-primary/10 px-4 py-3">
              <blockquote className="whitespace-pre-line text-sm leading-relaxed text-foreground">{note}</blockquote>
              <figcaption className="mt-1.5 text-xs font-medium text-muted-foreground">{inviterName}</figcaption>
            </figure>
          )}
        </CardHeader>

        <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
          <form onSubmit={sendCode} noValidate className="space-y-6">
            {formError && (
              <Alert variant="destructive" ref={formErrorRef} tabIndex={-1}>
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <fieldset className="space-y-4">
              <legend className="sr-only">About you</legend>

              <div className="space-y-1.5">
                <Label htmlFor={id("email")}>Email</Label>
                <div className="relative">
                  <Input id={id("email")} value={email} readOnly aria-describedby={`${id("email")}-hint`} className="h-11 bg-muted/50 pr-10 text-muted-foreground" />
                  <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                </div>
                <p id={`${id("email")}-hint`} className="text-xs text-muted-foreground">
                  You’ll sign in with this email address.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={id("firstName")}>First name</Label>
                  <Input
                    id={id("firstName")}
                    autoComplete="given-name"
                    className="h-11"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value)
                      clearServerError("firstName")
                    }}
                    aria-invalid={shown.firstName ? true : undefined}
                    aria-describedby={describe("firstName")}
                  />
                  <FieldMessage id={id("firstName")} error={shown.firstName} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={id("lastName")}>Last name</Label>
                  <Input
                    id={id("lastName")}
                    autoComplete="family-name"
                    className="h-11"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value)
                      clearServerError("lastName")
                    }}
                    aria-invalid={shown.lastName ? true : undefined}
                    aria-describedby={describe("lastName")}
                  />
                  <FieldMessage id={id("lastName")} error={shown.lastName} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={id("phone")}>Mobile</Label>
                <Input
                  id={id("phone")}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="0412 345 678"
                  className="h-11"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value)
                    clearServerError("phone")
                  }}
                  aria-invalid={shown.phone ? true : undefined}
                  aria-describedby={describe("phone", true)}
                />
                <FieldMessage id={id("phone")} error={shown.phone} hint="We’ll text a code here now, and each time you sign in." />
              </div>
            </fieldset>

            <fieldset className="space-y-2.5" aria-describedby={describe("credentials", true)}>
              <legend className="text-sm font-medium text-foreground">Your aviation background</legend>
              <p id={`${id("credentials")}-hint`} className="-mt-1 text-xs text-muted-foreground">
                Pick everything that applies.
              </p>
              <div className="flex flex-wrap gap-2">
                {CREDENTIALS.map((c) => {
                  const selected = credentials.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setCredentials((current) => toggleCredential(current, c.id))
                        clearServerError("credentials")
                      }}
                      className={cn(
                        "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                        selected
                          ? "border-primary bg-primary/10 font-medium text-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                        c.id === "none" && "border-dashed",
                      )}
                    >
                      {selected && <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
                      {c.label}
                    </button>
                  )
                })}
              </div>
              <FieldMessage id={id("credentials")} error={shown.credentials} />
            </fieldset>

            <div className="space-y-1.5">
              <Label htmlFor={id("password")}>Choose a password</Label>
              <div className="relative">
                <Input
                  id={id("password")}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="h-11 pr-11"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    clearServerError("password")
                  }}
                  aria-invalid={shown.password ? true : undefined}
                  aria-describedby={`${id("password")}-rule ${shown.password ? `${id("password")}-error` : ""}`.trim()}
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
              <p
                id={`${id("password")}-rule`}
                className={cn("flex items-center gap-1.5 text-xs transition-colors", passwordLongEnough ? "text-success" : "text-muted-foreground")}
              >
                {passwordLongEnough ? <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" /> : <Circle className="h-3.5 w-3.5" aria-hidden="true" />}
                At least {PASSWORD_MIN} characters
              </p>
              {shown.password && shown.password !== `Use at least ${PASSWORD_MIN} characters.` && (
                <FieldMessage id={id("password")} error={shown.password} />
              )}
            </div>

            <Button type="submit" size="lg" className="h-11 w-full gap-2" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Sending your code...
                </>
              ) : (
                <>
                  Text me a code
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="border-t border-border bg-muted/30 px-6 py-4 sm:px-8">
          <p className="w-full text-center text-xs text-muted-foreground">This invite is valid until {expires}.</p>
        </CardFooter>
      </Card>
    </>
  )
}
