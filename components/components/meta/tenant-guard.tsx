"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useTenant } from "@lib/tenant-context"

/**
 * Keeps a student off routes their school has switched off, and off AviPrep's
 * own commerce pages on a white-label subdomain.
 *
 * This is a navigation guard, not a security boundary: it stops someone landing
 * on a page that should not exist for them. Anything that must be *enforced*
 * belongs in the route handlers as well.
 */
export function TenantGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isLoading, isBlocked } = useTenant()

  const blocked = !isLoading && isBlocked(pathname)

  useEffect(() => {
    if (blocked) router.replace("/dashboard")
  }, [blocked, router])

  // Render nothing on the way out, so the disabled page never flashes up.
  if (blocked) return null

  return <>{children}</>
}
