"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowRight, Clock, Fingerprint, Signature, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUser } from "@lib/user-context"
import { cn } from "@lib/utils"

type IdentityStatus = "none" | "requires_input" | "processing" | "verified" | "canceled"
type PayoutStatus = "none" | "incomplete" | "pending" | "ready"

/**
 * A quiet reminder across the studio until a curator can be paid. It's hidden
 * on the Earnings page, where they'd be doing the setup anyway.
 */
export function CuratorSetupBanner() {
  const { user } = useUser()
  const pathname = usePathname()
  const [status, setStatus] = useState<{
    identity: IdentityStatus
    payouts: PayoutStatus
    paperwork?: { outstanding: number; next: string | null }
  } | null>(null)

  const isCurator = !!user?.isCurator
  useEffect(() => {
    if (!isCurator) return
    let cancelled = false
    fetch("/api/curators/payout-status")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => !cancelled && setStatus(d))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isCurator, pathname])

  const paperwork = status?.paperwork?.outstanding ?? 0
  const stripeReady = status?.identity === "verified" && status?.payouts === "ready"

  if (!isCurator || !status) return null
  // Hidden where they'd be doing the thing anyway.
  if (pathname === "/admin/earnings" && !paperwork) return null
  if (pathname === "/admin/documents" && (paperwork || stripeReady)) return null
  if (stripeReady && !paperwork) return null

  const checking = status.identity === "processing"
  const identityDone = status.identity === "verified"

  // Paperwork first: nothing else matters if the agreement isn't signed.
  const message =
    paperwork > 0
      ? {
          icon: Signature,
          title: paperwork === 1 ? `${status.paperwork!.next} still needs signing` : `${paperwork} documents still need signing`,
          text: "A few minutes. We’ve filled in most of it already.",
          cta: "Open",
          href: "/admin/documents",
        }
      : checking
        ? { icon: Clock, title: "We’re checking your ID", text: "Payouts open up the moment Stripe’s finished.", cta: "View", href: "/admin/earnings" }
        : !identityDone
          ? { icon: Fingerprint, title: "Verify your identity to get paid", text: "Two minutes with Stripe. Your royalties add up in the meantime.", cta: "Verify", href: "/admin/earnings" }
          : { icon: Wallet, title: "Finish setting up payouts", text: "Add your bank details with Stripe so we can pay your royalties.", cta: "Set up", href: "/admin/earnings" }
  const Icon = message.icon

  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3 lg:px-8",
        checking ? "border-border bg-muted/50" : "border-warning/30 bg-warning/10",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", checking ? "text-muted-foreground" : "text-warning")} aria-hidden="true" />
      <p className="min-w-0 text-sm text-foreground">
        <span className="font-medium">{message.title}</span>
        <span className="ml-2 text-muted-foreground">{message.text}</span>
      </p>
      <Button asChild size="sm" variant={checking ? "outline" : "default"} className="ml-auto h-8 gap-1.5">
        <Link href={message.href}>
          {message.cta}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </Button>
    </div>
  )
}
