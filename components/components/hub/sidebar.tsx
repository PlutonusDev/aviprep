"use client"

import { usePathname } from "next/navigation"
import Link from "@/components/meta/link"
import { cn } from "lib/utils"
import { useUser } from "@lib/user-context"
import { useTenant } from "@lib/tenant-context"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { Building2, LogOut } from "lucide-react"
import {
  NAV_GROUPS,
  SECONDARY_NAV,
  SCHOOL_NAV,
  ADMIN_NAV,
  CURATOR_NAV,
  isNavItemActive,
  filterNavItems,
  type NavItem,
} from "./nav-items"

const linkBase =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"

const TOUR_KEYS: Record<string, string> = {
  "/dashboard/learn": "nav-learn",
  "/dashboard/exams": "nav-exams",
  "/dashboard/insights": "nav-insights",
  "/dashboard/pricing": "nav-pricing",
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      data-tour={TOUR_KEYS[item.href]}
      aria-current={active ? "page" : undefined}
      className={cn(
        linkBase,
        active
          ? "bg-sidebar-accent text-sidebar-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
      )}
    >
      {/* A bar, not just colour, marks the current section. */}
      <span
        aria-hidden="true"
        className={cn(
          "-ml-3 h-5 w-0.5 rounded-full",
          active ? "bg-primary" : "bg-transparent",
        )}
      />
      <item.icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{item.name}</span>
    </Link>
  )
}

export default function Sidebar() {
  const { user, logout } = useUser()
  const { tenant, isWhitelabeled, disabledFeatures } = useTenant()
  const navFilter = { isTenant: isWhitelabeled, disabledFeatures }

  // Navigation is immediate now, so the pathname is the current path - there is
  // no pending destination to optimistically highlight.
  const currentPath = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-border bg-sidebar lg:flex">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-5">
        {isWhitelabeled && tenant ? (
          <>
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={tenant.logo || undefined} alt="" />
              <AvatarFallback className="bg-primary/10">
                <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-sidebar-foreground">
                {tenant.name}
              </span>
              <span className="text-xs text-muted-foreground">Training portal</span>
            </div>
          </>
        ) : (
          <img
            src="/img/AviPrep-logo.png"
            alt="AviPrep"
            width={176}
            height={44}
            className="h-11 w-auto"
          />
        )}
      </div>

      <nav aria-label="Main" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => {
          const items = filterNavItems(group.items, navFilter)
          // A group whose destinations are all switched off should disappear
          // rather than leave a stray heading.
          if (items.length === 0) return null
          return (
          <div key={group.label}>
            {/* Grouping turns one long list of eight into three scannable sets. */}
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {items.map((item) => (
                <NavLink key={item.href} item={item} active={isNavItemActive(currentPath, item.href)} />
              ))}
            </div>
          </div>
          )
        })}
      </nav>

      <div className="shrink-0 border-t border-border px-3 py-3">
        <nav aria-label="Account" className="space-y-0.5">
          {filterNavItems(SECONDARY_NAV, navFilter).map((item) => (
            <NavLink key={item.href} item={item} active={isNavItemActive(currentPath, item.href)} />
          ))}

          {user?.isFlightSchoolAdmin && (
            <NavLink item={SCHOOL_NAV} active={isNavItemActive(currentPath, SCHOOL_NAV.href)} />
          )}

          {user?.isAdmin && (
            <NavLink item={ADMIN_NAV} active={isNavItemActive(currentPath, ADMIN_NAV.href)} />
          )}
          {!user?.isAdmin && user?.isCurator && (
            <NavLink item={CURATOR_NAV} active={isNavItemActive(currentPath, CURATOR_NAV.href)} />
          )}
        </nav>

        {/* Signing out is set apart from ordinary destinations. */}
        <div className="mt-2 border-t border-border pt-2">
          <button
            type="button"
            onClick={logout}
            className={cn(
              linkBase,
              "w-full cursor-pointer text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
            )}
          >
            <span aria-hidden="true" className="-ml-3 h-5 w-0.5" />
            <LogOut className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}
