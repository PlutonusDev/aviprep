"use client"

import { usePathname } from "next/navigation"
import Link from "@/components/meta/link"
import { ArrowLeft, BookOpenText, LogOut } from "lucide-react"
import { useUser } from "@lib/user-context"
import { cn } from "@lib/utils"
import { isAdminNavActive, navGroupsForRole, type AdminNavItem } from "./admin-nav"

const linkBase =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"

export function AdminNavLink({ item, active }: { item: Pick<AdminNavItem, "name" | "href" | "icon">; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        linkBase,
        active ? "bg-sidebar-accent text-sidebar-foreground" : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
      )}
    >
      {/* A bar, not just colour, marks the current section. */}
      <span aria-hidden="true" className={cn("-ml-3 h-5 w-0.5 rounded-full", active ? "bg-primary" : "bg-transparent")} />
      <item.icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{item.name}</span>
    </Link>
  )
}

export function RoleBadge({ isAdmin }: { isAdmin: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        isAdmin ? "border-primary/30 bg-primary/10 text-foreground" : "border-border bg-muted text-muted-foreground",
      )}
    >
      {isAdmin ? "Admin" : "Curator"}
    </span>
  )
}

/** Grouped admin navigation, shared by the sidebar and the mobile sheet. */
export function AdminNav({ pathname, isAdmin }: { pathname: string; isAdmin: boolean }) {
  return (
    <nav aria-label="Admin" className="space-y-5">
      {navGroupsForRole(isAdmin).map((group) => (
        <div key={group.label}>
          {/* A single-item group reads better without a heading. */}
          {group.items.length > 1 && (
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{group.label}</p>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <AdminNavLink key={item.href} item={item} active={isAdminNavActive(pathname, item.href)} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

/** The guidelines PDF curators were sent, a click away while they write. */
export const GUIDELINES_HREF = "/api/curators/guidelines"

export function AdminNavFooter() {
  const { user, logout } = useUser()
  return (
    <div className="shrink-0 border-t border-border px-3 py-3">
      {user?.isCurator ? (
        <a
          href={GUIDELINES_HREF}
          target="_blank"
          rel="noopener"
          className={cn(linkBase, "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}
        >
          <span aria-hidden="true" className="-ml-3 h-5 w-0.5" />
          <BookOpenText className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
          <span className="truncate">Content guidelines</span>
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      ) : (
        <AdminNavLink item={{ name: "Back to dashboard", href: "/dashboard", icon: ArrowLeft }} active={false} />
      )}
      {/* Signing out is set apart from ordinary destinations. */}
      <div className="mt-2 border-t border-border pt-2">
        <button
          type="button"
          onClick={logout}
          className={cn(linkBase, "w-full cursor-pointer text-muted-foreground hover:bg-destructive/10 hover:text-destructive")}
        >
          <span aria-hidden="true" className="-ml-3 h-5 w-0.5" />
          <LogOut className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </div>
  )
}

export function AdminBrand({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="flex h-16 shrink-0 items-center justify-between gap-2.5 border-b border-border px-5">
      <Link href="/admin" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
        <img src="/img/AviPrep-logo.png" alt="AviPrep" width={176} height={44} className="h-11 w-auto" />
      </Link>
      <RoleBadge isAdmin={isAdmin} />
    </div>
  )
}

export function AdminSidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const isAdmin = !!user?.isAdmin

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-border bg-sidebar lg:flex">
      <AdminBrand isAdmin={isAdmin} />
      <div className="flex-1 overflow-y-auto px-3 py-4">{user && <AdminNav pathname={pathname} isAdmin={isAdmin} />}</div>
      <AdminNavFooter />
    </aside>
  )
}
