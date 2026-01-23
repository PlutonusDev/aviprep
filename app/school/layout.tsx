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

const navigation = [
  { name: "Dashboard", href: "/school", icon: LayoutDashboard },
  { name: "Students", href: "/school/students", icon: Users },
  { name: "Groups", href: "/school/groups", icon: FolderKanban },
  { name: "Progress", href: "/school/progress", icon: BarChart3 },
  { name: "Purchases", href: "/school/purchases", icon: ShoppingCart },
  { name: "API Integration", href: "/school/api", icon: Key },
  { name: "Settings", href: "/school/settings", icon: Settings },
]

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
            "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 py-5 border-b">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{school.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{school.subscriptionTier} Plan</p>
              </div>
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/school" && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>

            {/* Student count */}
            <div className="px-4 py-3 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Students</span>
                <span className="font-medium">
                  {studentCount} / {school.maxStudents}
                </span>
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min((studentCount / school.maxStudents) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Back to AviPrep */}
            <div className="px-3 py-3 border-t">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <GraduationCap className="h-5 w-5" />
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
