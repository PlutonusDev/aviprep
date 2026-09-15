import {
  LayoutDashboard,
  GraduationCap,
  ClipboardCheck,
  BarChart3,
  History,
  BrainCircuit,
  MessageSquare,
  Mail,
  Sparkles,
  Settings,
  Building2,
  ShieldCheck,
  PenLine,
} from "lucide-react"
import type React from "react"
import type { TenantFeature } from "@lib/tenant-features"

export interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  /** Lets a school hide this destination. Untagged items are always shown. */
  feature?: TenantFeature
  /** AviPrep-only commerce, never shown on a white-label subdomain. */
  aviprepOnly?: boolean
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

/**
 * The one definition of hub navigation. The desktop sidebar and the mobile sheet
 * both read from here - they previously kept separate lists that had already
 * drifted, leaving Learn, Forums and Messages unreachable on mobile.
 *
 * Icons are lucide throughout, matching the rest of the app: one family, one
 * stroke weight, outline only.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Study",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Subject courses", href: "/dashboard/learn", icon: GraduationCap , feature: "learn" },
      { name: "Practice exams", href: "/dashboard/exams", icon: ClipboardCheck },
    ],
  },
  {
    label: "Progress",
    items: [
      { name: "Statistics", href: "/dashboard/statistics", icon: BarChart3 , feature: "statistics" },
      { name: "Exam history", href: "/dashboard/history", icon: History , feature: "history" },
      { name: "AI insights", href: "/dashboard/insights", icon: BrainCircuit , feature: "insights" },
    ],
  },
  {
    label: "Community",
    items: [
      { name: "Forums", href: "/dashboard/forum", icon: MessageSquare , feature: "forums" },
      { name: "Messages", href: "/dashboard/messages", icon: Mail , feature: "messages" },
    ],
  },
]

export const SECONDARY_NAV: NavItem[] = [
  { name: "Upgrade", href: "/dashboard/pricing", icon: Sparkles , aviprepOnly: true },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

export const SCHOOL_NAV: NavItem = {
  name: "Manage flight school",
  href: "/school",
  icon: Building2,
}

export const CURATOR_NAV: NavItem = {
  name: "Content studio",
  href: "/admin/questions",
  icon: PenLine,
}

export const ADMIN_NAV: NavItem = {
  name: "Admin panel",
  href: "/admin",
  icon: ShieldCheck,
}

/** Nav the current tenant should actually see. */
export function filterNavItems(
  items: NavItem[],
  { isTenant, disabledFeatures }: { isTenant: boolean; disabledFeatures: string[] },
): NavItem[] {
  if (!isTenant) return items
  return items.filter(
    (item) =>
      !item.aviprepOnly && !(item.feature && disabledFeatures.includes(item.feature)),
  )
}

/**
 * Sub-pages must keep their section highlighted, so match on the path prefix.
 * "/dashboard" is exact-only, otherwise it would light up on every child route.
 */
export function isNavItemActive(currentPath: string, href: string) {
  if (href === "/dashboard") return currentPath === "/dashboard"
  return currentPath === href || currentPath.startsWith(`${href}/`)
}
