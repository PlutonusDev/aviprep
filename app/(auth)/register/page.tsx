"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, Eye, EyeOff, Check, Circle, ArrowLeft, ArrowRight } from "lucide-react"
import { useTenant } from "@lib/tenant-context"


const STEPS = [
  { title: "Your name", fields: ["firstName", "lastName"] },
  { title: "Contact details", fields: ["email", "phone"] },
  { title: "Licence & password", fields: ["arn", "password", "confirmPassword"] },
] as const

interface FieldProps {
  name: string
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
      {/* Hint stays visible; the error is added alongside it rather than replacing it. */}
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

export default function RegisterPage() {
  const router = useRouter()
  const { tenant, isWhitelabeled } = useTenant()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const errorRef = useRef<HTMLDivElement>(null)
  const [touched, setTouched] = useState<Partial<Record<string, boolean>>>({})
  const [step, setStep] = useState(0)
  const stepHeadingRef = useRef<HTMLParagraphElement>(null)
  const pendingFocusRef = useRef<string | null>(null)

  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    arn: "",
  })

  // Mirrors the server rules in lib/auth.ts, so a fixable mistake is caught
  // here instead of costing the user a failed round trip.
  const RULES = {
    firstName: (v: string) => (v.trim() ? null : "Enter your first name."),
    lastName: (v: string) => (v.trim() ? null : "Enter your last name."),
    email: (v: string) => (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? null : "Enter a valid email address."),
    phone: (v: string) =>
      /^(\+?61|0)4\d{8}$/.test(v.replace(/\s/g, ""))
        ? null
        : "Enter an Australian mobile, starting 04.",
    arn: (v: string) => (/^\d{6,7}$/.test(v) ? null : "Your ARN is 6 or 7 digits."),
    password: (v: string) => (v.length >= 8 ? null : "Use at least 8 characters."),
    confirmPassword: (v: string) => (v === formData.password ? null : "Passwords do not match."),
  } as const

  type FieldName = keyof typeof RULES

  const errorFor = (name: FieldName) =>
    touched[name] ? RULES[name](formData[name]) : null

  const markTouched = (e: React.FocusEvent<HTMLInputElement>) =>
    setTouched((prev) => ({ ...prev, [e.target.name]: true }))

  const fieldProps = (name: FieldName) => ({
    name,
    value: formData[name],
    error: errorFor(name),
    onChange: handleChange,
    onBlur: markTouched,
  })

  const isLastStep = step === STEPS.length - 1

  // Only advance when the current step is actually valid; the fields the user
  // has not reached yet must not block them.
  const advanceOrReport = (fields: readonly string[]) => {
    const invalid = fields.filter((n) => RULES[n as FieldName](formData[n as FieldName]) !== null)
    if (invalid.length === 0) return true
    setTouched((prev) => ({ ...prev, ...Object.fromEntries(fields.map((n) => [n, true])) }))
    document.getElementById(invalid[0])?.focus()
    return false
  }

  const goNext = () => {
    setError(null)
    if (!advanceOrReport(STEPS[step].fields)) return
    setStep((n) => Math.min(n + 1, STEPS.length - 1))
  }

  const goBack = () => {
    setError(null)
    setStep((n) => Math.max(n - 1, 0))
  }

  // Move focus to the new step so screen reader and keyboard users follow along.
  useEffect(() => {
    const pending = pendingFocusRef.current
    if (pending) {
      pendingFocusRef.current = null
      document.getElementById(pending)?.focus()
      return
    }
    stepHeadingRef.current?.focus()
  }, [step])

  const passwordChecks = [
    { label: "At least 8 characters", met: formData.password.length >= 8 },
    { label: "Passwords match", met: formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword },
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
    setError(null)
  }

  const formatPhone = (value: string) => {
    // Format as 04XX XXX XXX
    const cleaned = value.replace(/\D/g, "")
    if (cleaned.length <= 4) return cleaned
    if (cleaned.length <= 7) return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 10)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    setFormData((prev) => ({ ...prev, phone: formatted }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Enter inside an early step should move forward, not register.
    if (!isLastStep) {
      goNext()
      return
    }

    setIsLoading(true)
    setError(null)

    // Validate everything the server will, so the user fixes it here.
    const names = Object.keys(RULES) as FieldName[]
    const invalid = names.filter((n) => RULES[n](formData[n]) !== null)

    if (invalid.length > 0) {
      setTouched(Object.fromEntries(names.map((n) => [n, true])))
      setError(
        invalid.length === 1
          ? "One field needs your attention before we can continue."
          : `${invalid.length} fields need your attention before we can continue.`,
      )

      // The offending field may live on an earlier step, which is not mounted -
      // go back to that step first, then focus it once it exists.
      const targetStep = STEPS.findIndex((s) => s.fields.includes(invalid[0] as never))
      if (targetStep !== -1 && targetStep !== step) {
        pendingFocusRef.current = invalid[0]
        setStep(targetStep)
      } else {
        document.getElementById(invalid[0])?.focus()
      }

      setIsLoading(false)
      return
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone.replace(/\s/g, ""),
          arn: formData.arn,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Registration failed")
        setIsLoading(false)
        return
      }

      router.push("/dashboard")
    } catch {
      setError("An unexpected error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Mobile logo */}
      <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
        <img
          className="h-16 w-auto"
          src="/img/AviPrep-logo.png"
          alt="AviPrep"
          width={256}
          height={64}
        />
      </div>

      <Card className="border-0 bg-transparent shadow-none lg:rounded-xl lg:border lg:bg-card lg:p-2 lg:shadow-e3">
        <CardHeader className="space-y-1.5 px-0 pb-6 lg:px-6">
          <h1 className="text-display-3 font-bold">Create an Account</h1>
          {!tenant && (
            <CardDescription>
              All fields are required. It takes about a minute.
            </CardDescription>
          )}
        </CardHeader>
        {tenant ? (
          <CardContent className="px-0 lg:px-6">
            <div className="flex flex-col gap-3 mb-8">
              <p className="text-muted-foreground">
                Accounts are managed by <span className="font-semibold">{tenant.name}</span>
              </p>
              <p className="text-destructive">
                Please contact your flight school to create an account.
              </p>
            </div>
          </CardContent>
        ) : (
          <CardContent className="px-0 lg:px-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Segmented progress: position is carried by text, not colour alone. */}
              <div>
                <ol className="flex gap-1.5" aria-hidden="true">
                  {STEPS.map((s, i) => (
                    <li
                      key={s.title}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i <= step ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  ))}
                </ol>
                <p
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  aria-live="polite"
                  className="mt-3 text-sm font-medium text-foreground outline-none"
                >
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
                      {...fieldProps("email")}
                      label="Email"
                      type="email"
                      autoComplete="email"
                      placeholder="pilot@example.com"
                      hint="You'll use this to sign in."
                    />
                    <Field
                      {...fieldProps("phone")}
                      label="Australian mobile"
                      type="tel"
                      autoComplete="tel-national"
                      placeholder="04XX XXX XXX"
                      hint="Australian mobile number, starting with 04."
                      onChange={handlePhoneChange}
                      maxLength={12}
                    />
                  </>
                )}

                {step === 2 && (
                  <>
                    <Field
                      {...fieldProps("arn")}
                      label="Aviation Reference Number"
                      inputMode="numeric"
                      placeholder="123456"
                      maxLength={7}
                      hint="Your 6 or 7 digit CASA ARN, shown on your myCASA account."
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
                          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          )}
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
                          <span className={check.met ? "text-foreground" : "text-muted-foreground"}>
                            {check.label}
                          </span>
                          <span className="sr-only">{check.met ? "requirement met" : "not yet met"}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </fieldset>

              <div className="flex items-center gap-3 pt-1">
                {step > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={goBack}
                    disabled={isLoading}
                    className="h-11 cursor-pointer"
                  >
                    <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Back
                  </Button>
                )}

                {isLastStep ? (
                  <Button type="submit" size="lg" className="h-11 flex-1 cursor-pointer" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        Creating account...
                      </>
                    ) : (
                      "Create account"
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="lg"
                    onClick={goNext}
                    className="h-11 flex-1 cursor-pointer"
                    disabled={isLoading}
                  >
                    Continue
                    <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        )}
        <CardFooter className="mt-6 border-t border-border px-0 pt-6 lg:px-6">
          <p className="text-center text-sm text-muted-foreground w-full">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </>
  )
}
