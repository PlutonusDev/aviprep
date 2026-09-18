import type React from "react"
import {
  BarChart3,
  Building2,
  ClipboardCheck,
  GraduationCap,
  HelpCircle,
  ImageIcon,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Package,
  PenLine,
  Settings,
  ShieldCheck,
  Signature,
  Sparkles,
  Ticket,
  UserCircle,
  Users,
  Wallet,
} from "lucide-react"

export interface AdminNavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  /** Curators can open this section. Everything else is admin-only. */
  curator?: boolean
  /** Only curators see it (their own account). */
  curatorOnly?: boolean
}

export interface AdminNavGroup {
  label: string
  items: AdminNavItem[]
}

/**
 * The one admin navigation list, shared by the sidebar and the mobile menu.
 * Grouped the same way as the dashboard so a long list stays scannable.
 */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [{ name: "Overview", href: "/admin", icon: LayoutDashboard, curator: true }],
  },
  {
    label: "Content",
    items: [
      { name: "Review", href: "/admin/review", icon: ClipboardCheck },
      { name: "Courses", href: "/admin/courses", icon: GraduationCap, curator: true },
      // Curators reach the editor from MOS coverage, so the question bank stays
      // admin-only in the sidebar: one way in, against the MOS item they're filling.
      { name: "Questions", href: "/admin/questions", icon: HelpCircle },
      //{ name: "AI generator", href: "/admin/questions/generate", icon: Sparkles },
      { name: "MOS coverage", href: "/admin/mos", icon: ShieldCheck, curator: true },
    ],
  },
  {
    label: "People",
    items: [
      { name: "Members", href: "/admin/members", icon: Users },
      { name: "Curators", href: "/admin/curators", icon: PenLine },
      { name: "Flight schools", href: "/admin/flight-schools", icon: Building2 },
      { name: "Forums", href: "/admin/forums", icon: MessageSquare },
    ],
  },
  {
    label: "Sales",
    items: [
      { name: "Sales report", href: "/admin/sales", icon: BarChart3 },
      { name: "Curator payouts", href: "/admin/payouts", icon: Wallet },
      { name: "Products", href: "/admin/products", icon: Package },
      { name: "Coupons", href: "/admin/coupons", icon: Ticket },
    ],
  },
  {
    label: "Site",
    items: [
      { name: "Email", href: "/admin/email", icon: Mail },
      { name: "Card artwork", href: "/admin/branding", icon: ImageIcon },
      { name: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
  {
    label: "You",
    items: [
      { name: "Community", href: "/admin/community", icon: MessageSquare, curator: true, curatorOnly: true },
      { name: "Earnings", href: "/admin/earnings", icon: Wallet, curator: true, curatorOnly: true },
      { name: "Paperwork", href: "/admin/documents", icon: Signature, curator: true, curatorOnly: true },
      { name: "Account", href: "/admin/account", icon: UserCircle, curator: true, curatorOnly: true },
    ],
  },
]

/** Flat list, for anything that doesn't care about grouping. */
export const ADMIN_NAVIGATION: AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap((g) => g.items)

/** Admin-panel paths a curator may open. The APIs enforce the same rule. */
export const CURATOR_PATHS = [
  "/admin/courses",
  "/admin/questions",
  "/admin/mos",
  "/admin/account",
  "/admin/earnings",
  "/admin/documents",
  "/admin/community",
]

/** Admin-only pages inside otherwise curator-accessible sections. */
const CURATOR_EXCLUDED = ["/admin/questions/generate"]

export function curatorCanOpen(pathname: string) {
  // Their home: payout estimate, review status and feedback.
  if (pathname === "/admin") return true
  if (CURATOR_EXCLUDED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return false
  return CURATOR_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/** Groups visible to this role, with empty groups dropped. */
export function navGroupsForRole(isAdmin: boolean): AdminNavGroup[] {
  if (isAdmin) return ADMIN_NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !i.curatorOnly) })).filter((g) => g.items.length)
  return ADMIN_NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => i.curator).map((i) => (i.href === "/admin" ? { ...i, name: "Home" } : i)),
  })).filter((g) => g.items.length)
}

export function navForRole(isAdmin: boolean) {
  return navGroupsForRole(isAdmin).flatMap((g) => g.items)
}

export function isAdminNavActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin"
  if (href === "/admin/questions") return pathname === href || (pathname.startsWith(`${href}/`) && !pathname.startsWith("/admin/questions/generate"))
  return pathname === href || pathname.startsWith(`${href}/`)
}
