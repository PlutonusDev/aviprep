"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { HelpCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@lib/utils"

/**
 * The guide: a modal on the first visit, and a button that brings it back.
 *
 * Every explanation in the portal lives here, which is what lets the pages
 * themselves stay quiet and look like a product rather than a brochure.
 */

const SEEN_KEY = "aviprep-demo-guide-seen"

interface Section {
  title: string
  points: string[]
}

const GENERAL: Section = {
  title: "What you're looking at",
  points: [
    "The panel a flight school gets with AviPrep, filled with a made-up school and seventeen made-up students.",
    "Nothing here is a real person or a real result, and nothing you click changes anything.",
    "Students move between Online, In a course, Sitting an exam and the rest while you watch. That's what a school sees on a normal morning.",
  ],
}

/** Longest paths first: /demo/students/x must not match /demo/students. */
const PAGES: { match: (path: string) => boolean; section: Section }[] = [
  {
    match: (p) => /^\/demo\/students\/[^/]+$/.test(p),
    section: {
      title: "One student",
      points: [
        "Every practice exam they've sat, per subject, against the 70% pass mark.",
        "The subjects they're weakest in. Students see the same breakdown, down to the topic.",
        "Instructors open this before a progress check instead of asking how it's going.",
      ],
    },
  },
  {
    match: (p) => p === "/demo/students",
    section: {
      title: "Students",
      points: [
        "Your whole roster, filed under the group each student is in.",
        "The status column is live. Sort or search it, tick several and file them into a group in one go.",
        "Add students one at a time, or send us a CSV and we'll load the intake.",
      ],
    },
  },
  {
    match: (p) => p === "/demo/groups",
    section: {
      title: "Groups",
      points: [
        "A group is a class, an intake or a course.",
        "Give the group its subjects and every student in it gets them. Take someone out and the access goes too.",
        "A student can be in more than one.",
      ],
    },
  },
  {
    match: (p) => p === "/demo/instructors",
    section: {
      title: "Instructors",
      points: [
        "More than one person can run the school.",
        "Anyone here can invite another instructor by email.",
        "Only the owner can remove someone. Anyone can show themselves out.",
      ],
    },
  },
  {
    match: (p) => p === "/demo/seats",
    section: {
      title: "Seats",
      points: [
        "You buy seats per subject and hand them out as students come through.",
        "A seat comes back when a student leaves.",
      ],
    },
  },
  {
    match: (p) => p === "/demo/branding",
    section: {
      title: "Branding",
      points: [
        "Students sign in at your address and see your school, not ours.",
        "Your logo and colours carry into the student app and every email we send for you.",
        "Switch off any feature that doesn't suit how you teach. It disappears from their navigation and stops answering.",
      ],
    },
  },
  {
    match: (p) => p === "/demo/api",
    section: {
      title: "API",
      points: [
        "For schools whose own system already knows who's enrolled.",
        "Enrol, remove and read progress over HTTP. Webhooks push changes back to you.",
      ],
    },
  },
  {
    match: (p) => p === "/demo",
    section: {
      title: "Dashboard",
      points: [
        "Who's on AviPrep right now, and what they're doing.",
        "Students averaging under 70% or who haven't opened it in ten days.",
        "Results land in the feed as they're submitted.",
      ],
    },
  },
]

function Points({ section }: { section: Section }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
      <ul className="mt-2 space-y-2">
        {section.points.map((point) => (
          <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
            <span aria-hidden="true" className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-primary" />
            {point}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function DemoGuide({ organisation }: { organisation: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [welcome, setWelcome] = useState(false)
  const [nudge, setNudge] = useState(false)

  const page = PAGES.find((p) => p.match(pathname))?.section

  useEffect(() => {
    let seen = true
    try {
      seen = window.localStorage.getItem(SEEN_KEY) === "1"
    } catch {
      // Private windows and blocked storage: show it, it's only a modal.
      seen = false
    }
    if (!seen) setWelcome(true)
  }, [])

  function dismissWelcome() {
    setWelcome(false)
    try {
      window.localStorage.setItem(SEEN_KEY, "1")
    } catch {
      /* nothing to do */
    }
    // Point at the button they'll want next.
    setNudge(true)
    window.setTimeout(() => setNudge(false), 4000)
  }

  return (
    <>
      {/* The way back to the explanation, from anywhere. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="How this works"
        className={cn(
          "group fixed right-4 top-4 z-[60] flex h-11 w-11 items-center justify-center rounded-full border border-primary/40 bg-card text-primary shadow-e2 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:right-6 lg:top-6",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-0 rounded-full bg-primary/30 motion-reduce:hidden",
            nudge ? "animate-ping" : "animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]",
          )}
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full opacity-70 blur-md transition-opacity group-hover:opacity-100"
          style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--primary) 55%, transparent), transparent 70%)" }}
        />
        <HelpCircle className="relative h-5 w-5" aria-hidden="true" />
      </button>

      {/* First visit. */}
      <Dialog open={welcome} onOpenChange={(o) => !o && dismissWelcome()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">You&rsquo;re in the demo</DialogTitle>
            <DialogDescription>Opened for {organisation}.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <Points section={GENERAL} />
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
              The <HelpCircle className="mx-0.5 inline h-3.5 w-3.5 align-[-2px] text-primary" aria-hidden="true" /> in the corner explains whatever page
              you&rsquo;re on.
            </p>
          </div>

          <DialogFooter>
            <Button onClick={dismissWelcome} className="w-full sm:w-auto">
              Have a look
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* On demand. */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>How this works</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {page && <Points section={page} />}
            <div className={cn(page && "border-t border-border pt-5")}>
              <Points section={GENERAL} />
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <a href="/#flight-schools" className="text-sm font-medium text-primary hover:underline">
              Talk to us about your school
            </a>
            <Button variant="ghost" onClick={() => setOpen(false)} className="gap-1.5">
              <X className="h-4 w-4" aria-hidden="true" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
