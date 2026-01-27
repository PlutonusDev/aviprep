"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plane, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    arn: "",
  })

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
    setIsLoading(true)
    setError(null)

    // Client-side validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters")
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
        <img className="h-32" src="/img/AviPrep-logo.png" />
      </div>

      <Card className="border-0 shadow-none lg:border lg:shadow-sm bg-transparent lg:bg-card">
        <CardHeader className="space-y-1 px-0 lg:px-6">
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>Enter your details below to create your account and start studying</CardDescription>
        </CardHeader>
        <CardContent className="px-0 lg:px-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="pilot@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Australian Mobile Number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="04XX XXX XXX"
                value={formData.phone}
                onChange={handlePhoneChange}
                required
                disabled={isLoading}
                maxLength={12}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="arn">
                Aviation Reference Number (ARN)
                <span className="text-muted-foreground ml-1 text-xs font-normal">6 digits</span>
              </Label>
              <Input
                id="arn"
                name="arn"
                placeholder="123456"
                value={formData.arn}
                onChange={handleChange}
                required
                disabled={isLoading}
                minLength={6}
                maxLength={7}
                pattern="\d{6|7}"
              />
              <p className="text-xs text-muted-foreground">
                Your ARN is issued by CASA. Find it on the myCASA portal.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  minLength={8}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="cursor-pointer w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="px-0 lg:px-6">
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
