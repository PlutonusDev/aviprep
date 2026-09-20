"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowRight,
  BarChart3,
  Building2,
  FolderKanban,
  Key,
  LayoutDashboard,
  Menu,
  Palette,
  ShoppingCart,
  UserCog,
  Users,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DEMO_SCHOOL, DEMO_STUDENTS } from "@lib/demo/school"
import { cn } from "@lib/utils"

/**
 * The panel around the demo: the same sidebar a real school sees, plus a bar
 * that never lets anyone forget the numbers are made up.
 */

const NAV = [
  {
    label: "School",
    items: [
      { name: "Dashboard", href: "/demo", icon: LayoutDashboard },
      { name: "Students", href: "/demo/students", icon: Users },
      { name: "Groups", href: "/demo/groups", icon: FolderKanban },
      { name: "Instructors", href: "/demo/instructors", icon: UserCog },
    ],
  },
  {
    label: "Setup",
    items: [
      { name: "Seats & subjects", href: "/demo/seats", icon: ShoppingCart },
      { name: "Your branding", href: "/demo/branding", icon: Palette },
      { name: "API", href: "/demo/api", icon: Key },
    ],
  },
]

const linkBase =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"

export function DemoChrome({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="min-h-dvh bg-background">
      {/* Nothing in here is real, and it says so on every screen. */}
      <div className="border-b border-primary/30 bg-primary/10 px-4 py-2.5 lg:pl-[17.5rem]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="rounded bg-primary px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">Demo</span>
          <p className="min-w-0 flex-1 text-foreground">
            Sample school, sample students. Nothing here is a real person or a real result.
          </p>
          <Link href="/#flight-schools" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            Talk to us
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-sidebar transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-5">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${DEMO_SCHOOL.primaryColour}1a` }}
            >
              <Building2 className="h-4 w-4" style={{ color: DEMO_SCHOOL.primaryColour }} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">{DEMO_SCHOOL.name}</p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="rounded bg-primary px-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">Demo</span>
                {DEMO_SCHOOL.tier} plan
              </p>
            </div>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation">
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>

          <nav aria-label="Demo school" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
            {NAV.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{group.label}</p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = item.href === "/demo" ? pathname === "/demo" : pathname.startsWith(item.href)
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setOpen(false)}
                        className={cn(
                          linkBase,
                          active ? "bg-sidebar-accent text-sidebar-foreground" : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                        )}
                      >
                        <span aria-hidden="true" className={cn("-ml-3 h-5 w-0.5 rounded-full", active ? "bg-primary" : "bg-transparent")} />
                        <item.icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="shrink-0 border-t border-border px-5 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Students</span>
              <span className="font-medium text-sidebar-foreground" data-tabular>
                {DEMO_STUDENTS.length} / {DEMO_SCHOOL.maxStudents}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(DEMO_STUDENTS.length / DEMO_SCHOOL.maxStudents) * 100}%` }}
              />
            </div>
          </div>

          <div className="shrink-0 border-t border-border px-3 py-3">
            <Link href="/" className={cn(linkBase, "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
              <span aria-hidden="true" className="-ml-3 h-5 w-0.5" />
              <BarChart3 className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
              Back to aviprep.com.au
            </Link>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
          <span className="shrink-0 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">Demo</span>
          <p className="truncate text-sm font-medium text-foreground">{DEMO_SCHOOL.name}</p>
        </header>
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
