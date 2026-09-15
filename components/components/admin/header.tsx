"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import Link from "@/components/meta/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useUser } from "@lib/user-context"
import { cn } from "@lib/utils"
import { isAdminNavActive, navForRole } from "./admin-nav"

export function AdminHeader() {
  const pathname = usePathname()
  const { user } = useUser()
  const isAdmin = !!user?.isAdmin
  const [open, setOpen] = useState(false)

  useEffect(() => setOpen(false), [pathname])

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Admin navigation</SheetTitle>
            <div className="flex h-16 items-center gap-2 border-b border-border px-6">
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{isAdmin ? "Admin Panel" : "Content studio"}</span>
                <span className="text-xs text-muted-foreground">AviPrep</span>
              </div>
            </div>
            <nav aria-label="Admin" className="space-y-1 px-3 py-4">
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
              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              >
                Back to App
              </Link>
            </nav>
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 items-center">
          <h1 className="text-lg font-semibold">{isAdmin ? "Administration" : "Content studio"}</h1>
        </div>

        {user && (
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              isAdmin ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
            )}
          >
            {isAdmin ? "Admin" : "Curator"}
          </span>
        )}
      </div>
    </header>
  )
}
