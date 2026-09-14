"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, Eye, EyeOff, Building2 } from "lucide-react"
import { useTenant } from "@lib/tenant-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { tenant, isWhitelabeled } = useTenant()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const errorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Login failed")
        setIsLoading(false)
        return
      }

      const redirectUrl = searchParams.get("redirect") || "/dashboard"
      router.push(redirectUrl)
    } catch {
      setError("An unexpected error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Mobile logo */}
      <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
        {isWhitelabeled && tenant ? (
          <>
            <Avatar className="h-10 w-10">
              <AvatarImage src={tenant.logo || undefined} />
              <AvatarFallback className="bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </AvatarFallback>
            </Avatar>
            <span className="text-xl font-bold text-foreground">{tenant.name}</span>
          </>
        ) : (
          <img
            className="h-16 w-auto"
            src="/img/AviPrep-logo.png"
            alt="AviPrep"
            width={256}
            height={64}
          />
        )}
      </div>

      {/*isWhitelabeled && tenant?.welcomeMessage && (
        <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/10 text-center">
          <p className="text-sm text-muted-foreground">{tenant.welcomeMessage}</p>
        </div>
      )*/}

      <Card className="border-0 bg-transparent shadow-none lg:rounded-xl lg:border lg:bg-card lg:p-2 lg:shadow-e3">
        <CardHeader className="space-y-1.5 px-0 pb-6 lg:px-6">
          <h1 className="text-display-3 font-bold">Welcome back</h1>
          <CardDescription>
            {isWhitelabeled && tenant 
              ? `Sign in to ${tenant.name} training portal`
              : "Enter your credentials to access your account"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 lg:px-6">
          <form onSubmit={handleSubmit} className="space-y-5">
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
                name="email"
                type="email"
                autoComplete="email"
                placeholder="pilot@example.com"
                className="h-11"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isLoading}
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
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
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

            <Button type="submit" size="lg" className="h-11 w-full cursor-pointer" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="mt-6 border-t border-border px-0 pt-6 lg:px-6">
          <p className="text-center text-sm text-muted-foreground w-full">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Create account
            </Link>
          </p>
        </CardFooter>
      </Card>
    </>
  )
}
