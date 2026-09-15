"use client"

import Link from "@/components/meta/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, LogOut } from "lucide-react"
import { useUser } from "@lib/user-context"
import { cn } from "@lib/utils"
import { isAdminNavActive, navForRole } from "./admin-nav"

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useUser()
  const isAdmin = !!user?.isAdmin

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-border bg-card lg:flex">
      <div className="flex h-16 items-center justify-center gap-2 border-b border-border px-6">
        <img className="h-10" src="/img/AviPrep-logo.png" alt="AviPrep" />
        <p className="text-lg font-semibold text-muted-foreground">{isAdmin ? "Admin Panel" : "Content studio"}</p>
      </div>

      <nav aria-label="Admin" className="flex-1 space-y-1 px-3 py-4">
        {user &&
          navForRole(isAdmin).map((item) => {
            const isActive = isAdminNavActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                {item.name}
              </Link>
            )
          })}
      </nav>

      <div className="border-t border-border px-3 py-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
        >
          <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
          Back to App
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
