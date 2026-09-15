"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowRight, Gift } from "lucide-react"
import { useTenant } from "@lib/tenant-context"
import { useUser } from "@lib/user-context"

/**
 * Stays across the dashboard until a new member picks their free subject. Not
 * dismissible, and hidden on the picker itself and on school portals (school
 * students get their subjects from the school).
 */
export function FreeSubjectBanner() {
  const pathname = usePathname()
  const { user, isLoading } = useUser()
  const { isWhitelabeled } = useTenant()

  if (isLoading || !user?.canClaimFreeSubject || isWhitelabeled) return null
  if (pathname.startsWith("/dashboard/choose-subject")) return null

  return (
    <div role="region" aria-label="Free subject" className="border-b border-primary/25 bg-primary/10">
      <div className="flex flex-col gap-2 px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:gap-3 lg:px-6">
        <p className="flex min-w-0 flex-1 items-start gap-2 text-foreground sm:items-center">
          <Gift className="mt-0.5 h-4 w-4 shrink-0 text-primary sm:mt-0" aria-hidden="true" />
          <span>
            <span className="font-medium">Pick your free subject.</span> Unlock lessons, practice exams and insights for
            one subject.
          </span>
        </p>
        <Link
          href="/dashboard/choose-subject"
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md px-2 py-1 font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:self-auto"
        >
          Choose subject
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
