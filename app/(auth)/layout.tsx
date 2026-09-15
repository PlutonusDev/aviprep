"use client"

import type React from "react"
import Link from "next/link"
import { BarChart3, BookOpen, Building2, ClipboardList, Sparkles } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTenant } from "@lib/tenant-context"

/*
 * The auth screens borrow the dashboard's frame: a sidebar-toned panel on the
 * left (same surface, border and logo block as the app sidebar) and cards on the
 * right. Signing in should feel like arriving in the product, not leaving a
 * marketing page.
 */

const HIGHLIGHTS = [
  { icon: ClipboardList, title: "Practice exams", hint: "Exam-style questions for every subject" },
  { icon: BookOpen, title: "Lessons", hint: "Structured courses from RPL to ATPL" },
  { icon: Sparkles, title: "Insights", hint: "See exactly where your marks slip" },
  { icon: BarChart3, title: "Progress", hint: "Scores, history and study time" },
]

function Brand({ compact = false }: { compact?: boolean }) {
  const { tenant, isWhitelabeled } = useTenant()
  if (isWhitelabeled && tenant) {
    return (
      <span className="flex min-w-0 items-center gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={tenant.logo || undefined} alt="" />
          <AvatarFallback className="bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
          </AvatarFallback>
        </Avatar>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold text-sidebar-foreground">{tenant.name}</span>
          {!compact && <span className="text-xs text-muted-foreground">Training portal</span>}
        </span>
      </span>
    )
  }
  return <img src="/img/AviPrep-logo.png" alt="AviPrep" width={176} height={44} className={compact ? "h-9 w-auto" : "h-11 w-auto"} />
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { tenant, isWhitelabeled, isLoading } = useTenant()

  if (isLoading) {
    return (
      <div role="status" className="flex min-h-dvh items-center justify-center bg-background">
        <div aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="sr-only">Loading</span>
      </div>
    )
  }

  const school = isWhitelabeled && tenant ? tenant : null
  const background = school?.loginBackground

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[minmax(22rem,26rem)_1fr]">
      {/* Side panel: the app sidebar's surface, logo block and footer. */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-6">
          <Link href="/" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Brand />
          </Link>
        </div>

        <div className="flex flex-1 flex-col justify-center overflow-y-auto px-8 py-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {school ? "Training portal" : "CASA theory exam prep"}
          </p>
          <h2 className="mt-2 font-heading text-2xl font-bold leading-tight text-sidebar-foreground text-balance">
            {school ? school.welcomeMessage || `Welcome to ${school.name}` : "Everything for your theory exams, in one place."}
          </h2>

          <ul className="mt-8 space-y-1">
            {HIGHLIGHTS.map((h) => (
              <li key={h.title} className="flex items-center gap-3 rounded-lg px-2 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <h.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-sidebar-foreground">{h.title}</span>
                  <span className="block text-xs text-muted-foreground">{h.hint}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="shrink-0 border-t border-sidebar-border px-6 py-4 text-xs text-muted-foreground">
          {school ? (
            <div className="space-y-1">
              {school.footerText && <p>{school.footerText}</p>}
              {!school.hideBranding && (
                <p>
                  Powered by{" "}
                  <a href="https://aviprep.com.au" className="hover:text-foreground hover:underline">
                    AviPrep
                  </a>
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <span>&copy; {new Date().getFullYear()} AviPrep</span>
              <span className="flex gap-3">
                <Link href="/terms" className="hover:text-foreground hover:underline">
                  Terms
                </Link>
                <Link href="/privacy" className="hover:text-foreground hover:underline">
                  Privacy
                </Link>
              </span>
            </div>
          )}
        </div>
      </aside>

      <div className="relative flex min-h-dvh flex-col">
        {background && (
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${background})` }}
          >
            <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" />
          </div>
        )}

        {/* Mobile top bar, matching the dashboard header. */}
        <header className="relative flex h-16 shrink-0 items-center border-b border-sidebar-border bg-sidebar px-4 lg:hidden">
          <Link href="/" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Brand compact />
          </Link>
        </header>

        <main className="relative flex flex-1 items-center justify-center px-4 py-8 sm:px-8 lg:py-12">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  )
}
