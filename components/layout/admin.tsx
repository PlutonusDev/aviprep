"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Lock } from "lucide-react"
import { AdminHeader } from "@/components/admin/header"
import { AdminSidebar } from "@/components/admin/sidebar"
import { curatorCanOpen } from "@/components/admin/admin-nav"
import { Button } from "@/components/ui/button"
import { BackgroundBeams } from "@/ui/background-beams"
import { useUser } from "@lib/user-context"

function Blocked({ title, text, href, cta }: { title: string; text: string; href: string; cta: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Lock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </span>
        <h2 className="mt-4 font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
        <Button asChild className="mt-5 h-10">
          <Link href={href}>{cta}</Link>
        </Button>
      </div>
    </div>
  )
}

/**
 * Admin panel frame. Admins see everything; curators see only the content
 * tools. The server enforces this on every API as well - this guard just keeps
 * curators from landing on screens that would only show errors.
 */
export default ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading } = useUser()

  const isAdmin = !!user?.isAdmin
  const isCurator = !isAdmin && !!user?.isCurator

  // A curator opening the panel root lands on their workspace.
  useEffect(() => {
    if (isCurator && pathname === "/admin") router.replace("/admin/questions")
  }, [isCurator, pathname, router])

  let content: React.ReactNode = children
  if (isLoading || (isCurator && pathname === "/admin")) {
    content = (
      <div role="status" className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Loading</span>
      </div>
    )
  } else if (!isAdmin && !isCurator) {
    content = <Blocked title="No access" text="This area is for the AviPrep team." href="/dashboard" cta="Back to dashboard" />
  } else if (isCurator && !curatorCanOpen(pathname)) {
    content = (
      <Blocked
        title="Not part of the content studio"
        text="Curators work on courses and questions. Everything else is admin-only."
        href="/admin/questions"
        cta="Go to questions"
      />
    )
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <AdminSidebar />
      <div className="lg:pl-64">
        <AdminHeader />
        <div className="relative overflow-hidden">
          <main>{content}</main>
        </div>
      </div>
      <div className="pointer-events-none absolute left-0 top-0 h-full w-screen opacity-70">
        <BackgroundBeams />
      </div>
    </div>
  )
}
