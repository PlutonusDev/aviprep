import type React from "react"
import type { Metadata } from "next"
import { BadgeDollarSign, PenLine, ShieldCheck } from "lucide-react"

/*
 * Frame for the curators subdomain's sign-in and join pages (served at /login
 * and /join/<token> by proxy.ts). Same shape as the member auth screens - a
 * sidebar-toned panel and a card - so the studio feels like part of AviPrep,
 * but it speaks to writers, not students.
 */

export const metadata: Metadata = {
  title: { default: "Content studio", template: "AviPrep | %s" },
  description: "The AviPrep content studio, for curators writing questions and lessons.",
  robots: { index: false, follow: false },
}

const HIGHLIGHTS = [
  { icon: PenLine, title: "Write", hint: "Questions, explanations and lessons" },
  { icon: ShieldCheck, title: "Map to the MOS", hint: "Tag your work to Part 61 Schedule 3" },
  { icon: BadgeDollarSign, title: "Earn", hint: "Royalties on everything that goes live" },
]

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <img src="/img/AviPrep-logo.png" alt="AviPrep" width={176} height={44} className={compact ? "h-9 w-auto" : "h-11 w-auto"} />
      <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Studio
      </span>
    </span>
  )
}

export default function CuratorAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[minmax(22rem,26rem)_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-6">
          <Brand />
        </div>

        <div className="flex flex-1 flex-col justify-center overflow-y-auto px-8 py-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Content studio</p>
          <h2 className="mt-2 font-heading text-2xl font-bold leading-tight text-sidebar-foreground text-balance">
            Write the questions student pilots learn from.
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

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-sidebar-border px-6 py-4 text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} AviPrep</span>
          <span className="flex gap-3">
            <a href="/terms" className="hover:text-foreground hover:underline">
              Terms
            </a>
            <a href="/privacy" className="hover:text-foreground hover:underline">
              Privacy
            </a>
          </span>
        </div>
      </aside>

      <div className="relative flex min-h-dvh flex-col">
        <header className="flex h-16 shrink-0 items-center border-b border-sidebar-border bg-sidebar px-4 lg:hidden">
          <Brand compact />
        </header>
        <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8 lg:py-12">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  )
}
