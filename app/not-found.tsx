import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Compass, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
}

/**
 * Site-wide 404. Aviation-flavoured but brief: say what happened, then give two
 * clear ways back.
 */
export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <header className="relative flex h-16 items-center px-4 sm:px-6">
        <Link href="/" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <img src="/img/AviPrep-logo.png" alt="AviPrep" width={176} height={44} className="h-10 w-auto" />
        </Link>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-xl text-center">
          {/* Flight path that drifts off the planned route. Decorative. */}
          <svg viewBox="0 0 320 90" className="mx-auto h-20 w-full max-w-sm" aria-hidden="true">
            <path d="M10 70 L110 70" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
            <path
              d="M110 70 C 160 70, 190 20, 250 28"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.5"
              strokeDasharray="6 7"
              strokeLinecap="round"
            />
            <path d="M110 70 L310 70" stroke="var(--border)" strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" />
            <circle cx="10" cy="70" r="5" fill="var(--muted-foreground)" />
            <circle cx="310" cy="70" r="5" fill="none" stroke="var(--muted-foreground)" strokeWidth="2" />
            <g transform="translate(262 26) rotate(-8)">
              <path d="M-12 0 L10 0 M2 -9 L6 0 L2 9 M-10 -4 L-7 0 L-10 4" stroke="var(--primary)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </svg>

          <p className="mt-6 font-mono text-sm font-semibold uppercase tracking-[0.3em] text-primary flex items-center justify-center gap-2">
            Error 404
          </p>
          <h1 className="mt-3 text-display-2 font-bold text-balance">You&apos;ve drifted off course</h1>
          <p className="mx-auto mt-4 max-w-md text-lg text-muted-foreground text-pretty">
            This page doesn&apos;t exist, or it&apos;s moved. Let&apos;s get you back on your planned route.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 gap-2 px-6">
              <Link href="/dashboard">
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Go to dashboard
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 gap-2 px-6">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to home
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
