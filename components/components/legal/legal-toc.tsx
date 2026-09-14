"use client"

import { useEffect, useState, useCallback } from "react"
import { usePathname } from "next/navigation"

interface TocEntry {
  id: string
  text: string
  level: 2 | 3
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80)
}

/**
 * Builds its own list of sections from whatever headings the page rendered, so
 * a legal page never has to declare a table of contents by hand. Headings
 * without an id get a slug assigned in place, which is also what makes each
 * section linkable.
 */
export function LegalToc({ contentId }: { contentId: string }) {
  const [entries, setEntries] = useState<TocEntry[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  // The legal layout persists across route changes, so this component never
  // unmounts when moving between documents. Without the pathname dependency the
  // list would keep the previous page's sections and observe detached nodes.
  const pathname = usePathname()

  useEffect(() => {
    const root = document.getElementById(contentId)
    if (!root) return

    setOpen(false)

    const headings = Array.from(root.querySelectorAll<HTMLHeadingElement>("h2, h3"))
    const seen = new Map<string, number>()

    const found: TocEntry[] = headings.map((el) => {
      if (!el.id) {
        const base = slugify(el.textContent ?? "") || "section"
        // Two sections can share a title; keep every id unique.
        const n = seen.get(base) ?? 0
        seen.set(base, n + 1)
        el.id = n === 0 ? base : `${base}-${n + 1}`
      }
      return {
        id: el.id,
        text: (el.textContent ?? "").trim(),
        level: el.tagName === "H3" ? 3 : 2,
      }
    })

    setEntries(found)
    if (found.length > 0) setActiveId(found[0].id)

    // Highlight the heading nearest the top of the viewport. The top inset keeps
    // a heading from counting as "current" while still under the sticky header.
    const observer = new IntersectionObserver(
      (records) => {
        const visible = records
          .filter((r) => r.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]?.target.id) setActiveId(visible[0].target.id)
      },
      { rootMargin: "-88px 0px -70% 0px", threshold: 0 },
    )

    headings.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [contentId, pathname])

  const handleJump = useCallback((e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id)
    if (!target) return
    e.preventDefault()

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })

    // Move keyboard focus with the scroll, or the next Tab resumes from the nav.
    target.setAttribute("tabindex", "-1")
    target.focus({ preventScroll: true })

    history.replaceState(null, "", `#${id}`)
    setActiveId(id)
    setOpen(false)
  }, [])

  if (entries.length === 0) return null

  const list = (
    <ul className="space-y-0.5">
      {entries.map((entry) => {
        const isActive = entry.id === activeId
        return (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              onClick={(e) => handleJump(e, entry.id)}
              aria-current={isActive ? "location" : undefined}
              className={[
                "block rounded-md py-1.5 pr-2 text-sm leading-snug transition-colors",
                entry.level === 3 ? "pl-6 text-[13px]" : "pl-3",
                isActive
                  ? "bg-primary/10 font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              ].join(" ")}
            >
              {/* The bar is decorative; aria-current carries the state. */}
              <span
                aria-hidden="true"
                className={[
                  "mr-2 inline-block h-3 w-0.5 translate-y-0.5 rounded-full",
                  isActive ? "bg-primary" : "bg-transparent",
                ].join(" ")}
              />
              {entry.text}
            </a>
          </li>
        )
      })}
    </ul>
  )

  return (
    <>
      {/* Mobile: a disclosure, so the contents never push the document down. */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="legal-toc-mobile"
          className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium"
        >
          On this page
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          >
            <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <nav
          id="legal-toc-mobile"
          aria-label="Sections of this document"
          hidden={!open}
          className="mt-2 rounded-lg border border-border bg-card p-2"
        >
          {list}
        </nav>
      </div>

      {/* Desktop: sticky rail alongside the document. */}
      <nav
        aria-label="Sections of this document"
        className="hidden lg:block sticky top-24 max-h-[calc(100dvh-8rem)] overflow-y-auto pr-2"
      >
        <p className="mb-3 pl-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          On this page
        </p>
        {list}
      </nav>
    </>
  )
}
