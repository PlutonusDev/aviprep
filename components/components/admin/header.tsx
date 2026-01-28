"use client"

import { Menu, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import Link from "@/components/meta/link"
import { usePathname } from "next/navigation"
import { cn } from "@lib/utils"
import { LayoutDashboard, Users, HelpCircle, Package, Ticket, Sparkles } from "lucide-react"

const navigation = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Members", href: "/admin/members", icon: Users },
  { name: "Questions", href: "/admin/questions", icon: HelpCircle },
  { name: "AI Generator", href: "/admin/questions/generate", icon: Sparkles },
  { name: "Products", href: "/admin/products", icon: Package },
  { name: "Coupons", href: "/admin/coupons", icon: Ticket },
]

export function AdminHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex h-16 items-center gap-2 border-b border-border px-6">
              <div className="flex flex-col">
                <span className="text-sm font-semibold">Admin Panel</span>
                <span className="text-xs text-muted-foreground">AviPrep</span>
              </div>
            </div>
            <nav className="space-y-1 px-3 py-4">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 items-center">
          <h1 className="text-lg font-semibold">Administration</h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-500">
            Admin Mode
          </span>
        </div>
      </div>
    </header>
  )
}
