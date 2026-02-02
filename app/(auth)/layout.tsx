"use client"

import type React from "react"
import { Building2 } from "lucide-react"
import Link from "next/link"
import { useTenant } from "@lib/tenant-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { tenant, isWhitelabeled, isLoading } = useTenant()

  // Show loading state briefly
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  // Whitelabeled school layout
  if (isWhitelabeled && tenant) {
    return (
      <div 
        className="min-h-screen flex"
        style={tenant.loginBackground ? {
          backgroundImage: `url(${tenant.loginBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        } : undefined}
      >
        {/* Left side - school branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 via-background to-background backdrop-blur-sm flex-col justify-between p-12">
          <Link href="/" className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarImage src={tenant.logo || undefined} />
              <AvatarFallback className="bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </AvatarFallback>
            </Avatar>
            <span className="text-xl font-bold text-foreground">{tenant.name}</span>
          </Link>

          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-foreground text-balance">
              {tenant.welcomeMessage || `Welcome to ${tenant.name} Training Portal`}
            </h1>
            <p className="text-lg text-muted-foreground text-pretty">
              Access your exam preparation materials, track your progress, and prepare for your CASA theory exams with confidence.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4">
              {[
                "Practice Questions",
                "Progress Tracking",
                "Study Materials",
                "Performance Analytics"
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {tenant.footerText && (
              <p className="text-sm text-muted-foreground">{tenant.footerText}</p>
            )}
            {!tenant.hideBranding && (
              <p className="text-xs text-muted-foreground/60">
                Powered by <Link href="https://aviprep.com.au" className="hover:underline">AviPrep</Link>
              </p>
            )}
          </div>
        </div>

        {/* Right side - form */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background/95 backdrop-blur-sm">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    )
  }

  // Default AviPrep layout
  return (
    <div className="min-h-screen flex">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary/5 flex-col justify-between p-12">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-xl font-bold text-foreground">AviPrep</span>
        </Link>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-foreground text-balance">
            Your journey to becoming a pilot starts here
          </h1>
          <p className="text-lg text-muted-foreground text-pretty">
            Access comprehensive practice exams, track your progress with detailed analytics, and get AI-powered
            insights to focus your study on areas that matter most.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm text-foreground">Weeks worth of learning content</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm text-foreground">From RPL to ATPL, including IREX</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm text-foreground">AI-Powered Insights</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm text-foreground">CASA Exam Aligned</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Trusted by student pilots across Australia preparing for their theory exams.
        </p>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
