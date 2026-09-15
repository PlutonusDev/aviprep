"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ClipboardCheck, GraduationCap, LayoutDashboard, LineChart, Menu } from "lucide-react"
import { useTenant } from "@lib/tenant-context"
import { filterNavItems, isNavItemActive, type NavItem } from "./nav-items"
import { cn } from "@lib/utils"

export const OPEN_MENU_EVENT = "aviprep:open-menu"

const TABS: NavItem[] = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard },
  { name: "Courses", href: "/dashboard/learn", icon: GraduationCap, feature: "learn" },
  { name: "Exams", href: "/dashboard/exams", icon: ClipboardCheck },
  { name: "Progress", href: "/dashboard/statistics", icon: LineChart, feature: "statistics" },
]

/**
 * App-style bottom navigation for phones and tablets (and the installed app).
 * Four core destinations plus "More", which opens the full navigation sheet
 * from the header, so there's one menu rather than two that can drift.
 */
export function MobileTabBar() {
  const pathname = usePathname()
  const { isWhitelabeled, disabledFeatures } = useTenant()
  const tabs = filterNavItems(TABS, { isTenant: isWhitelabeled, disabledFeatures })

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto flex h-16 max-w-lg items-stretch">
        {tabs.map((tab) => {
          const active = isNavItemActive(pathname, tab.href)
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-primary/10")}>
                  <tab.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {tab.name}
              </Link>
            </li>
          )
        })}
        <li className="flex-1">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_MENU_EVENT))}
            className="flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <span className="flex h-7 w-12 items-center justify-center">
              <Menu className="h-5 w-5" aria-hidden="true" />
            </span>
            More
          </button>
        </li>
      </ul>
    </nav>
  )
}
