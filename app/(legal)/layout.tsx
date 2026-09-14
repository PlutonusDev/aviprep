import Link from "next/link"
import { LegalToc } from "@/components/legal/legal-toc"

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
]

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#legal-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-e3"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 rounded-md" aria-label="AviPrep home">
            <img src="/img/AviPrep-logo.png" alt="AviPrep" width={160} height={40} className="h-9 w-auto" />
          </Link>
          <nav aria-label="Legal documents" className="flex items-center gap-1">
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12">
          <aside className="mb-8 lg:mb-0">
            <LegalToc contentId="legal-content" />
          </aside>

          {/* scroll-mt keeps a targeted heading clear of the sticky header. */}
          <main
            id="legal-content"
            className="min-w-0 [&_h2]:scroll-mt-24 [&_h3]:scroll-mt-24"
          >
            {children}
          </main>
        </div>
      </div>

      <footer className="border-t border-border bg-card/50">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>&copy; {new Date().getFullYear()} AviPrep. All rights reserved.</p>
          <Link href="/" className="underline underline-offset-4 hover:text-foreground">
            Back to AviPrep
          </Link>
        </div>
      </footer>
    </div>
  )
}
