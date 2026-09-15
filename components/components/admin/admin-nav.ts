import type React from "react"
import {
  Building2,
  GraduationCap,
  HelpCircle,
  ImageIcon,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Package,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react"

export interface AdminNavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  /** Curators can open this section. Everything else is admin-only. */
  curator?: boolean
}

/** The one admin navigation list, shared by the sidebar and the mobile menu. */
export const ADMIN_NAVIGATION: AdminNavItem[] = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Members", href: "/admin/members", icon: Users },
  { name: "Flight Schools", href: "/admin/flight-schools", icon: Building2 },
  { name: "Courses", href: "/admin/courses", icon: GraduationCap, curator: true },
  { name: "Questions", href: "/admin/questions", icon: HelpCircle, curator: true },
  { name: "AI question generator", href: "/admin/questions/generate", icon: Sparkles },
  { name: "Card artwork", href: "/admin/branding", icon: ImageIcon },
  { name: "Email", href: "/admin/email", icon: Mail },
  { name: "Products", href: "/admin/products", icon: Package },
  { name: "Coupons", href: "/admin/coupons", icon: Ticket },
  { name: "Forums", href: "/admin/forums", icon: MessageSquare },
]

/** Admin-panel paths a curator may open. The APIs enforce the same rule. */
export const CURATOR_PATHS = ["/admin/courses", "/admin/questions"]

/** Admin-only pages inside otherwise curator-accessible sections. */
const CURATOR_EXCLUDED = ["/admin/questions/generate"]

export function curatorCanOpen(pathname: string) {
  if (CURATOR_EXCLUDED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return false
  return CURATOR_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function navForRole(isAdmin: boolean) {
  return isAdmin ? ADMIN_NAVIGATION : ADMIN_NAVIGATION.filter((i) => i.curator)
}

export function isAdminNavActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin"
  if (href === "/admin/questions") return pathname === href || (pathname.startsWith(`${href}/`) && !pathname.startsWith("/admin/questions/generate"))
  return pathname === href || pathname.startsWith(`${href}/`)
}
