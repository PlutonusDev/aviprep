"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { BookOpenText, LayoutDashboard, LogOut, Menu, Settings, UserCircle } from "lucide-react"
import Link from "@/components/meta/link"
import { ThemeToggle } from "@/components/meta/theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useUser } from "@lib/user-context"
import { ADMIN_NAVIGATION, isAdminNavActive } from "./admin-nav"
import { AdminBrand, AdminNav, AdminNavFooter, GUIDELINES_HREF, RoleBadge } from "./sidebar"

export function AdminHeader() {
  const pathname = usePathname()
  const { user, logout } = useUser()
  const isAdmin = !!user?.isAdmin
  const [open, setOpen] = useState(false)

  useEffect(() => setOpen(false), [pathname])

  // The current section, so the bar says where you are on small screens.
  const current = [...ADMIN_NAVIGATION].reverse().find((i) => isAdminNavActive(pathname, i.href))
  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : ""
  const fullName = user ? `${user.firstName} ${user.lastName}` : ""

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border bg-sidebar">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-72 flex-col gap-0 p-0">
            <SheetTitle className="sr-only">Admin navigation</SheetTitle>
            <AdminBrand isAdmin={isAdmin} />
            <div className="flex-1 overflow-y-auto px-3 py-4">{user && <AdminNav pathname={pathname} isAdmin={isAdmin} />}</div>
            <AdminNavFooter />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="truncate text-sm font-medium text-muted-foreground">
            <span className="hidden sm:inline">{isAdmin ? "Admin" : "Content studio"}</span>
            {current && current.href !== "/admin" && (
              <>
                <span className="mx-2 hidden text-border sm:inline" aria-hidden="true">
                  /
                </span>
                <span className="text-foreground">{current.name}</span>
              </>
            )}
          </span>
          {user && (
            <span className="sm:hidden">
              <RoleBadge isAdmin={isAdmin} />
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button asChild variant="outline" size="sm" className="hidden h-9 gap-2 md:inline-flex">
              <Link href="/dashboard">
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Dashboard
              </Link>
            </Button>
          )}
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full" aria-label="Account menu">
                <Avatar className="h-9 w-9">
                  {user?.profilePicture && <AvatarImage src={user.profilePicture} alt="" />}
                  <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{fullName}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isAdmin ? (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">
                      <LayoutDashboard className="mr-2 h-4 w-4" aria-hidden="true" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings">
                      <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                      Account settings
                    </Link>
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/account">
                      <UserCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                      Account
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href={GUIDELINES_HREF} target="_blank" rel="noopener">
                      <BookOpenText className="mr-2 h-4 w-4" aria-hidden="true" />
                      Content guidelines
                    </a>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
