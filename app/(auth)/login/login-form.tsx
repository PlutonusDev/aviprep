"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2, MessageSquareText } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { OtpInput, ResendCode } from "@/components/auth/otp"
import { useLogin } from "@/components/auth/use-login"
import { useTenant } from "@lib/tenant-context"
import { useRegistrationStatus } from "@/components/auth/use-registration"
import { toast } from "sonner"

/** Only same-site paths, so ?redirect= can't send people to another website. */
function safeRedirect(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/dashboard"
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { tenant, isWhitelabeled } = useTenant()
  const [showPassword, setShowPassword] = useState(false)
  const errorRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const registration = useRegistrationStatus()
  const login = useLogin({ onSignedIn: () => router.push(safeRedirect(searchParams.get("redirect"))) })
  const resetDone = searchParams.get("reset") === "1"
  const emailVerified = searchParams.get("email") === "verified"

  useEffect(() => {
    if (emailVerified) toast.success("Email confirmed. Sign in to continue.", { id: "email-verified" })
  }, [emailVerified])

  useEffect(() => {
    if (login.error) errorRef.current?.focus()
  }, [login.error])

  useEffect(() => {
    if (login.stage === "password") headingRef.current?.focus()
  }, [login.stage])

  const onPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    login.submitPassword()
  }

  return (
    <>
      <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-e1">
        {login.stage === "password" ? (
          <>
            <CardHeader className="space-y-1.5 p-6 pb-5 sm:p-8 sm:pb-6">
              <h1 ref={headingRef} tabIndex={-1} className="font-heading text-2xl font-bold tracking-tight outline-none">
                Welcome back
              </h1>
              <CardDescription>
                {isWhitelabeled && tenant ? `Sign in to ${tenant.name}` : "Sign in to keep studying."}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
              <form onSubmit={onPasswordSubmit} className="space-y-5">
                {resetDone && !login.error && (
                  <Alert>
                    <AlertDescription>Password changed. Sign in with your new one.</AlertDescription>
                  </Alert>
                )}
                {login.error && (
                  <Alert variant="destructive" ref={errorRef} tabIndex={-1}>
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    <AlertDescription>{login.error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    placeholder="pilot@example.com"
                    className="h-11"
                    value={login.email}
                    onChange={(e) => {
                      login.setEmail(e.target.value)
                      login.setError(null)
                    }}
                    required
                    disabled={login.loading}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={login.password}
                      onChange={(e) => {
                        login.setPassword(e.target.value)
                        login.setError(null)
                      }}
                      required
                      disabled={login.loading}
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

                <Button type="submit" size="lg" className="h-11 w-full" disabled={login.loading}>
                  {login.loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
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
                We texted a 6-digit code to <span className="font-medium text-foreground">{login.maskedPhone}</span>.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  login.submitCode()
                }}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="otp">Code</Label>
                  <OtpInput
                    value={login.code}
                    onChange={(v) => {
                      login.setCode(v)
                      login.setCodeError(null)
                    }}
                    onComplete={(v) => login.submitCode(v)}
                    error={login.codeError}
                    disabled={login.loading}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                  <Label htmlFor="remember" className="cursor-pointer font-normal">
                    <span className="block text-sm font-medium text-foreground">Remember this device</span>
                    <span className="block text-xs text-muted-foreground">Skip the code here for 30 days.</span>
                  </Label>
                  <Switch id="remember" checked={login.remember} onCheckedChange={login.setRemember} />
                </div>

                <Button type="submit" size="lg" className="h-11 w-full" disabled={login.loading}>
                  {login.loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      Checking...
                    </>
                  ) : (
                    "Verify and sign in"
                  )}
                </Button>

                <ResendCode
                  challenge={login.challenge}
                  initialWait={login.resendWait}
                  onError={(message, restart) => (restart ? login.backToPassword(message) : login.setCodeError(message))}
                  className="text-center"
                />
              </form>
            </CardContent>
          </>
        )}

        <CardFooter className="border-t border-border bg-muted/30 px-6 py-4 sm:px-8">
          {login.stage === "code" ? (
            <button
              type="button"
              onClick={() => login.backToPassword()}
              className="mx-auto flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Use a different account
            </button>
          ) : registration.open === false ? (
            <p className="w-full text-center text-sm text-muted-foreground">New registrations are currently closed.</p>
          ) : (
            <p className="w-full text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Create account
              </Link>
            </p>
          )}
        </CardFooter>
      </Card>
    </>
  )
}
