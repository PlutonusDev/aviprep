"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AlertCircle, ArrowLeft, ArrowRight, Check, Circle, Eye, EyeOff, Loader2, Pencil } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { OtpInput, ResendCode } from "@/components/auth/otp"
import { useTenant } from "@lib/tenant-context"
import { useRegistrationStatus } from "@/components/auth/use-registration"

/*
 * Step order matters for password managers. Browsers treat the text field just
 * before the password as the username, so email sits directly above the
 * password on the last step - otherwise Chrome saved the ARN as the login.
 */
const STEPS = [
  { title: "Your name", fields: ["firstName", "lastName"] },
  { title: "Licence & mobile", fields: ["arn", "phone"] },
  { title: "Confirm your mobile", fields: [] },
  { title: "Email & password", fields: ["email", "password", "confirmPassword"] },
] as const

const VERIFY_STEP = 2

type FieldName = "firstName" | "lastName" | "arn" | "phone" | "email" | "password" | "confirmPassword"

interface FieldProps {
  name: FieldName
  label: string
  value: string
  error: string | null
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void
  hint?: string
  type?: string
  autoComplete?: string
  placeholder?: string
  maxLength?: number
  inputMode?: "numeric" | "text" | "tel" | "email"
}

function Field({ name, label, value, error, onChange, onBlur, hint, ...rest }: FieldProps) {
  const hintId = hint ? `${name}-hint` : undefined
  const errorId = error ? `${name}-error` : undefined
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        aria-invalid={error ? true : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
        required
        className="h-11"
        {...rest}
      />
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

const digits = (v: string) => v.replace(/\D/g, "")

export default function RegisterPage() {
  const router = useRouter()
  const { tenant } = useTenant()
  const registration = useRegistrationStatus()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const errorRef = useRef<HTMLDivElement>(null)
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({})
  const [step, setStep] = useState(0)
  const stepHeadingRef = useRef<HTMLParagraphElement>(null)
  const pendingFocusRef = useRef<string | null>(null)

  // Phone verification state
  const [challenge, setChallenge] = useState<string | null>(null)
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null)
  const [resendWait, setResendWait] = useState(60)
  const [code, setCode] = useState("")
  const [codeError, setCodeError] = useState<string | null>(null)
  const [phoneProof, setPhoneProof] = useState<string | null>(null)
  /** The number the proof is for; editing the phone afterwards invalidates it. */
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    arn: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  // Mirrors the server rules in lib/auth.ts.
  const RULES: Record<FieldName, (v: string) => string | null> = {
    firstName: (v) => (v.trim() ? null : "Enter your first name."),
    lastName: (v) => (v.trim() ? null : "Enter your last name."),
    arn: (v) => (/^\d{6,7}$/.test(v) ? null : "Your ARN is 6 or 7 digits."),
    phone: (v) => (/^(\+?61|0)4\d{8}$/.test(v.replace(/\s/g, "")) ? null : "Enter an Australian mobile, starting 04."),
    email: (v) => (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? null : "Enter a valid email address."),
    password: (v) => (v.length >= 8 ? null : "Use at least 8 characters."),
    confirmPassword: (v) => (v === formData.password ? null : "Passwords don't match."),
  }

  const errorFor = (name: FieldName) => (touched[name] ? RULES[name](formData[name]) : null)
  const markTouched = (e: React.FocusEvent<HTMLInputElement>) =>
    setTouched((prev) => ({ ...prev, [e.target.name]: true }))

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError(null)
  }

  const fieldProps = (name: FieldName) => ({
    name,
    value: formData[name],
    error: errorFor(name),
    onChange: handleChange,
    onBlur: markTouched,
  })

  const formatPhone = (value: string) => {
    const cleaned = digits(value).slice(0, 10)
    if (cleaned.length <= 4) return cleaned
    if (cleaned.length <= 7) return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`
  }

  const isVerified = !!phoneProof && verifiedPhone === digits(formData.phone)

  const validate = (fields: readonly string[]) => {
    const invalid = fields.filter((n) => RULES[n as FieldName](formData[n as FieldName]) !== null)
    if (invalid.length === 0) return true
    setTouched((prev) => ({ ...prev, ...Object.fromEntries(fields.map((n) => [n, true])) }))
    document.getElementById(invalid[0])?.focus()
    return false
  }

  useEffect(() => {
    const pending = pendingFocusRef.current
    if (pending) {
      pendingFocusRef.current = null
      document.getElementById(pending)?.focus()
      return
    }
    if (step !== VERIFY_STEP) stepHeadingRef.current?.focus()
  }, [step])

  async function sendCode() {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/otp/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digits(formData.phone) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || "Couldn't send a code.")
        return false
      }
      setChallenge(data.challenge)
      setMaskedPhone(data.maskedPhone)
      setResendWait(60)
      setCode("")
      setCodeError(null)
      return true
    } catch {
      setError("Couldn't reach the server. Check your connection.")
      return false
    } finally {
      setIsLoading(false)
    }
  }

  async function verifyCode(value = code) {
    if (value.length !== 6) return setCodeError("Enter the 6-digit code.")
    setIsLoading(true)
    setCodeError(null)
    try {
      const res = await fetch("/api/auth/otp/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge, code: value }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCodeError(data.error || "That code isn't right.")
        setCode("")
        return
      }
      setPhoneProof(data.phoneProof)
      setVerifiedPhone(digits(formData.phone))
      setStep(VERIFY_STEP + 1)
    } catch {
      setCodeError("Couldn't reach the server. Check your connection.")
    } finally {
      setIsLoading(false)
    }
  }

  async function goNext() {
    setError(null)
    if (!validate(STEPS[step].fields)) return

    if (step === 1) {
      // Already confirmed this exact number: don't text again.
      if (isVerified) return setStep(VERIFY_STEP + 1)
      if (await sendCode()) setStep(VERIFY_STEP)
      return
    }
    if (step === VERIFY_STEP) return verifyCode()
    setStep((n) => Math.min(n + 1, STEPS.length - 1))
  }

  function goBack() {
    setError(null)
    // Going back from the account step skips over an already-finished code step.
    setStep((n) => (n === VERIFY_STEP + 1 && isVerified ? 1 : Math.max(n - 1, 0)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step !== STEPS.length - 1) return goNext()

    const names = Object.keys(RULES) as FieldName[]
    const invalid = names.filter((n) => RULES[n](formData[n]) !== null)
    if (invalid.length > 0) {
      setTouched(Object.fromEntries(names.map((n) => [n, true])))
      const target = STEPS.findIndex((s) => (s.fields as readonly string[]).includes(invalid[0]))
      if (target !== -1 && target !== step) {
        pendingFocusRef.current = invalid[0]
        setStep(target)
      } else {
        document.getElementById(invalid[0])?.focus()
      }
      return
    }
    if (!isVerified) {
      pendingFocusRef.current = "phone"
      setStep(1)
      return setError("Confirm your mobile number first.")
    }

    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: digits(formData.phone),
          arn: formData.arn,
          phoneProof,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || "Couldn't create your account.")
        if (data.field === "phone") {
          // Proof expired (30 minutes) or doesn't match: verify again.
          setPhoneProof(null)
          setVerifiedPhone(null)
          pendingFocusRef.current = "phone"
          setStep(1)
        }
        return
      }
      router.push("/dashboard/choose-subject")
    } catch {
      setError("Couldn't reach the server. Check your connection.")
    } finally {
      setIsLoading(false)
    }
  }

  const passwordChecks = [
    { label: "At least 8 characters", met: formData.password.length >= 8 },
    { label: "Passwords match", met: formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword },
  ]

  return (
    <>
      <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-e1">
        <CardHeader className="space-y-1.5 p-6 pb-5 sm:p-8 sm:pb-6">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {registration.open === false && !tenant ? "Registrations are closed" : "Create an account"}
          </h1>
          {!tenant && registration.open !== false && (
            <CardDescription>Takes about a minute. We&apos;ll text you a code to confirm your mobile.</CardDescription>
          )}
        </CardHeader>

        {!tenant && registration.open === false ? (
          <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
            <p className="text-muted-foreground">
              {registration.message || "We're not taking new sign-ups right now. Please check back soon."}
            </p>
            <Button asChild className="mt-6 h-11 w-full">
              <Link href="/login">Sign in to an existing account</Link>
            </Button>
          </CardContent>
        ) : tenant ? (
          <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
            <div className="mb-8 flex flex-col gap-3">
              <p className="text-muted-foreground">
                Accounts are managed by <span className="font-semibold">{tenant.name}</span>
              </p>
              <p className="text-destructive">Please contact your flight school to create an account.</p>
            </div>
          </CardContent>
        ) : (
          <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <ol className="flex gap-1.5" aria-hidden="true">
                  {STEPS.map((s, i) => (
                    <li key={s.title} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
                  ))}
                </ol>
                <p ref={stepHeadingRef} tabIndex={-1} aria-live="polite" className="mt-3 text-sm font-medium text-foreground outline-none">
                  <span className="text-muted-foreground">
                    Step {step + 1} of {STEPS.length}
                  </span>
                  <span className="mx-2 text-muted-foreground/50" aria-hidden="true">
                    &middot;
                  </span>
                  {STEPS[step].title}
                </p>
              </div>

              {error && (
                <Alert variant="destructive" ref={errorRef} tabIndex={-1}>
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <fieldset className="space-y-4" disabled={isLoading}>
                <legend className="sr-only">{STEPS[step].title}</legend>

                {step === 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    <Field {...fieldProps("firstName")} label="First name" autoComplete="given-name" placeholder="Jane" />
                    <Field {...fieldProps("lastName")} label="Last name" autoComplete="family-name" placeholder="Cooper" />
                  </div>
                )}

                {step === 1 && (
                  <>
                    <Field
                      {...fieldProps("arn")}
                      label="Aviation Reference Number"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="123456"
                      maxLength={7}
                      hint="Your 6 or 7 digit CASA ARN, shown in myCASA."
                    />
                    <Field
                      {...fieldProps("phone")}
                      label="Australian mobile"
                      type="tel"
                      autoComplete="tel-national"
                      placeholder="04XX XXX XXX"
                      hint={isVerified ? "Confirmed." : "We'll text a code to confirm it."}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, phone: formatPhone(e.target.value) }))
                        setError(null)
                      }}
                      maxLength={12}
                    />
                  </>
                )}

                {step === VERIFY_STEP && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Enter the code we texted to <span className="font-medium text-foreground">{maskedPhone}</span>.{" "}
                      <button
                        type="button"
                        onClick={() => {
                          pendingFocusRef.current = "phone"
                          setStep(1)
                        }}
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                      >
                        <Pencil className="h-3 w-3" aria-hidden="true" />
                        Change number
                      </button>
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="otp">Code</Label>
                      <OtpInput
                        value={code}
                        onChange={(v) => {
                          setCode(v)
                          setCodeError(null)
                        }}
                        onComplete={(v) => verifyCode(v)}
                        error={codeError}
                        disabled={isLoading}
                      />
                    </div>
                    <ResendCode
                      key={challenge ?? "none"}
                      challenge={challenge}
                      initialWait={resendWait}
                      onError={(message, restart) => {
                        setCodeError(message)
                        if (restart) setStep(1)
                      }}
                    />
                  </div>
                )}

                {step === 3 && (
                  <>
                    <Field
                      {...fieldProps("email")}
                      label="Email"
                      type="email"
                      autoComplete="username"
                      placeholder="pilot@example.com"
                      hint="You'll sign in with this."
                    />

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          autoComplete="new-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="At least 8 characters"
                          value={formData.password}
                          onChange={handleChange}
                          onBlur={markTouched}
                          aria-invalid={errorFor("password") ? true : undefined}
                          aria-describedby="password-requirements"
                          required
                          className="h-11 pr-11"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          aria-pressed={showPassword}
                          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                        </button>
                      </div>
                    </div>

                    <Field
                      {...fieldProps("confirmPassword")}
                      label="Confirm password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                    />

                    <ul id="password-requirements" className="space-y-1.5">
                      {passwordChecks.map((check) => (
                        <li key={check.label} className="flex items-center gap-2 text-sm">
                          {check.met ? (
                            <Check className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                          ) : (
                            <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden="true" />
                          )}
                          <span className={check.met ? "text-foreground" : "text-muted-foreground"}>{check.label}</span>
                          <span className="sr-only">{check.met ? "requirement met" : "not yet met"}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </fieldset>

              <div className="flex items-center gap-3 pt-1">
                {step > 0 && (
                  <Button type="button" variant="outline" size="lg" onClick={goBack} disabled={isLoading} className="h-11">
                    <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Back
                  </Button>
                )}

                <Button type="submit" size="lg" className="h-11 flex-1" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      {step === 1 ? "Sending code..." : step === VERIFY_STEP ? "Checking..." : "Creating account..."}
                    </>
                  ) : step === STEPS.length - 1 ? (
                    "Create account"
                  ) : step === VERIFY_STEP ? (
                    "Confirm"
                  ) : (
                    <>
                      {step === 1 && !isVerified ? "Send code" : "Continue"}
                      <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        )}

        <CardFooter className="border-t border-border bg-muted/30 px-6 py-4 sm:px-8">
          <p className="w-full text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </>
  )
}
