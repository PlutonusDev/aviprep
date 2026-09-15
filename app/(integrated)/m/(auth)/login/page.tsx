"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2, MessageSquareText } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { OtpInput, ResendCode } from "@/components/auth/otp"
import { useLogin } from "@/components/auth/use-login"
import { useRegistrationStatus } from "@/components/auth/use-registration"

function TopBar({ onBack, href }: { onBack?: () => void; href?: string }) {
  const cls =
    "flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  return (
    <div className="flex h-14 items-center px-2">
      {href ? (
        <Link href={href} aria-label="Back" className={cls}>
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
      ) : (
        <button type="button" onClick={onBack} aria-label="Back" className={cls}>
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

export default function MobileLogin() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const login = useLogin({ onSignedIn: () => router.push("/dashboard") })
  const registration = useRegistrationStatus()

  if (login.stage === "code") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          login.submitCode()
        }}
        className="flex flex-1 flex-col"
      >
        <TopBar onBack={() => login.backToPassword()} />
        <div className="flex flex-1 flex-col px-6 pb-8">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
            <MessageSquareText className="h-5 w-5 text-primary" aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight">Check your phone</h1>
          <p className="mt-1 text-muted-foreground">
            Enter the code we texted to <span className="font-medium text-foreground">{login.maskedPhone}</span>.
          </p>

          <div className="mt-8 space-y-3">
            <Label htmlFor="otp" className="sr-only">
              Code
            </Label>
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
            <ResendCode
              challenge={login.challenge}
              initialWait={login.resendWait}
              onError={(message, restart) => (restart ? login.backToPassword(message) : login.setCodeError(message))}
            />
          </div>

          <div className="mt-auto space-y-4 pt-8">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-3.5">
              <Label htmlFor="remember" className="cursor-pointer font-normal">
                <span className="block text-sm font-medium text-foreground">Remember this device</span>
                <span className="block text-xs text-muted-foreground">Skip the code here for 30 days.</span>
              </Label>
              <Switch id="remember" checked={login.remember} onCheckedChange={login.setRemember} />
            </div>
            <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={login.loading}>
              {login.loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />}
              {login.loading ? "Checking..." : "Verify and sign in"}
            </Button>
          </div>
        </div>
      </form>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        login.submitPassword()
      }}
      className="flex flex-1 flex-col"
    >
      <TopBar href="/m" />
      <div className="flex flex-1 flex-col px-6 pb-8">
        <img src="/img/AviPrep-logo.png" alt="AviPrep" width={176} height={44} className="h-10 w-auto self-start" />
        <h1 className="mt-6 font-heading text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-muted-foreground">Sign in to keep studying.</p>

        <div className="mt-8 space-y-5">
          {login.error && (
            <Alert variant="destructive">
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
              inputMode="email"
              value={login.email}
              onChange={(e) => {
                login.setEmail(e.target.value)
                login.setError(null)
              }}
              required
              disabled={login.loading}
              className="h-12 text-base"
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
                className="h-12 pr-12 text-base"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-auto space-y-4 pt-8">
          <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={login.loading}>
            {login.loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />}
            {login.loading ? "Signing in..." : "Sign in"}
          </Button>
          {registration.open !== false && (
            <p className="text-center text-sm text-muted-foreground">
              New to AviPrep?{" "}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Create an account
              </Link>
            </p>
          )}
        </div>
      </div>
    </form>
  )
}
