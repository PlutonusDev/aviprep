"use client"

import type React from "react"
import { useState, useEffect, createContext, useContext } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  Key,
  ShoppingCart,
  FolderKanban,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface FlightSchool {
  id: string
  name: string
  logo: string | null
  email: string
  maxStudents: number
  subscriptionTier: string
  apiEnabled: boolean
}

interface SchoolUser {
  id: string
  email: string
  firstName: string
  lastName: string
  profilePicture: string | null
}

interface SchoolContextType {
  school: FlightSchool | null
  user: SchoolUser | null
  studentCount: number
  isLoading: boolean
  refreshData: () => void
}

const SchoolContext = createContext<SchoolContextType>({
  school: null,
  user: null,
  studentCount: 0,
  isLoading: true,
  refreshData: () => {},
})

export const useSchool = () => useContext(SchoolContext)

/** Grouped to match the student sidebar, which reads far better than one list. */
const navGroups = [
  {
    label: "School",
    items: [
      { name: "Dashboard", href: "/school", icon: LayoutDashboard },
      { name: "Students", href: "/school/students", icon: Users },
      { name: "Groups", href: "/school/groups", icon: FolderKanban },
      { name: "Progress", href: "/school/progress", icon: BarChart3 },
    ],
  },
  {
    label: "Setup",
    items: [
      { name: "Purchases", href: "/school/purchases", icon: ShoppingCart },
      { name: "API integration", href: "/school/api", icon: Key },
      { name: "Settings", href: "/school/settings", icon: Settings },
    ],
  },
]

const linkBase =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"

export default function SchoolLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [school, setSchool] = useState<FlightSchool | null>(null)
  const [user, setUser] = useState<SchoolUser | null>(null)
  const [studentCount, setStudentCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const fetchData = async () => {
    try {
      const res = await fetch("/api/school/me")
      if (!res.ok) {
        router.push("/login?redirect=/school")
        return
      }
      const data = await res.json()
      setSchool(data.school)
      setUser(data.user)
      setStudentCount(data.studentCount)
    } catch (error) {
      console.error("Failed to fetch school data:", error)
      router.push("/login")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!school || !user) {
    return null
  }

  return (
    <SchoolContext.Provider value={{ school, user, studentCount, isLoading, refreshData: fetchData }}>
      <div className="min-h-screen bg-background">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-sidebar transition-transform duration-200 lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex h-full flex-col">
            <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-5">
              {/* The school's own mark when they have one. */}
              {school.logo ? (
                <img
                  src={school.logo}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-lg object-contain"
                />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-sidebar-foreground">{school.name}</p>
                <p className="text-xs capitalize text-muted-foreground">
                  {school.subscriptionTier} plan
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>

            <nav aria-label="School" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
              {navGroups.map((group) => (
                <div key={group.label}>
                  <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      // "/school" is exact-only, or it would light up everywhere.
                      const isActive =
                        item.href === "/school"
                          ? pathname === "/school"
                          : pathname === item.href || pathname.startsWith(`${item.href}/`)
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          aria-current={isActive ? "page" : undefined}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            linkBase,
                            isActive
                              ? "bg-sidebar-accent text-sidebar-foreground"
                              : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                          )}
                        >
                          {/* A bar, not just colour, marks the current section. */}
                          <span
                            aria-hidden="true"
                            className={cn(
                              "-ml-3 h-5 w-0.5 rounded-full",
                              isActive ? "bg-primary" : "bg-transparent"
                            )}
                          />
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
                  {studentCount} / {school.maxStudents}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min((studentCount / school.maxStudents) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="shrink-0 border-t border-border px-3 py-3">
              <Link
                href="/dashboard"
                className={cn(linkBase, "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}
              >
                <span aria-hidden="true" className="-ml-3 h-5 w-0.5" />
                <GraduationCap className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                Back to AviPrep
              </Link>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="lg:pl-64">
          {/* Header */}
          <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 py-3 bg-background/95 backdrop-blur border-b lg:px-6">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex-1" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.profilePicture || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {user.firstName[0]}
                      {user.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium">
                    {user.firstName} {user.lastName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/school/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          {/* Page content */}
          <main className="p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </SchoolContext.Provider>
  )
}
