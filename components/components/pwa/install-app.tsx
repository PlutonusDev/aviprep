"use client"

import { useEffect, useState } from "react"
import { Download, Share, SquarePlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { usePwa } from "./pwa-provider"
import { cn } from "@lib/utils"

const DISMISS_KEY = "aviprep:install-dismissed"

/** iOS has no install prompt: explain the Share > Add to Home Screen route. */
function IosInstructions({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add AviPrep to your Home Screen</DialogTitle>
          <DialogDescription>It opens full screen, like any other app.</DialogDescription>
        </DialogHeader>
        <ol className="space-y-3 py-2 text-sm">
          <li className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Share className="h-4 w-4 text-primary" aria-hidden="true" />
            </span>
            <span>
              Tap <span className="font-medium">Share</span> in Safari&apos;s toolbar
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <SquarePlus className="h-4 w-4 text-primary" aria-hidden="true" />
            </span>
            <span>
              Choose <span className="font-medium">Add to Home Screen</span>
            </span>
          </li>
        </ol>
      </DialogContent>
    </Dialog>
  )
}

/** "Install app" button. Renders nothing when the app can't be installed from here. */
export function InstallAppButton({ className, variant = "outline" }: { className?: string; variant?: "outline" | "default" | "secondary" }) {
  const { canInstall, isIos, isStandalone, install } = usePwa()
  const [iosOpen, setIosOpen] = useState(false)

  if (isStandalone || (!canInstall && !isIos)) return null

  return (
    <>
      <Button
        type="button"
        variant={variant}
        className={cn("gap-2", className)}
        onClick={() => (canInstall ? install() : setIosOpen(true))}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Install app
      </Button>
      <IosInstructions open={iosOpen} onOpenChange={setIosOpen} />
    </>
  )
}

/**
 * A dismissible card on the dashboard for phones and tablets. Hidden once
 * installed, when installing isn't possible, or after "Not now".
 */
export function InstallAppCard() {
  const { canInstall, isIos, isStandalone, install } = usePwa()
  const [dismissed, setDismissed] = useState(true)
  const [iosOpen, setIosOpen] = useState(false)

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1")
    } catch {
      setDismissed(false)
    }
  }, [])

  if (dismissed || isStandalone || (!canInstall && !isIos)) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      window.localStorage.setItem(DISMISS_KEY, "1")
    } catch {
      // Storage unavailable; it'll come back next visit.
    }
  }

  return (
    <section aria-label="Install the app" className="lg:hidden">
      <div className="relative flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-e1">
        <img src="/android-chrome-192x192.png" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-xl border border-border" />
        <div className="min-w-0 flex-1 pr-6">
          <p className="font-semibold text-foreground">Get the AviPrep app</p>
          <p className="text-sm text-muted-foreground">Full screen, on your home screen.</p>
        </div>
        <Button size="sm" className="h-9 shrink-0" onClick={async () => {
          if (!canInstall) return setIosOpen(true)
          const outcome = await install()
          if (outcome === "accepted") dismiss()
        }}>
          Install
        </Button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Not now"
          className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <IosInstructions open={iosOpen} onOpenChange={setIosOpen} />
    </section>
  )
}
