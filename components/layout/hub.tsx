"use client"

import Header from "@/components/hub/header"
import Sidebar from "@/components/hub/sidebar"
import { usePathname } from "next/navigation"
import { TenantGuard } from "@/components/meta/tenant-guard"
import { Onboarding } from "@/components/onboarding/onboarding"

/**
 * Focused tasks get the whole viewport, with no sidebar or header competing:
 * reading a lesson, and sitting an exam.
 */
const IMMERSIVE_ROUTES = [
  /^\/dashboard\/learn\/[^/]+\/lesson\//,
  /^\/dashboard\/exams\/[^/]+\/?$/,
]

export default ({ children }: { children: React.ReactNode }) => {
    const pathname = usePathname()
    const isImmersive = IMMERSIVE_ROUTES.some((r) => r.test(pathname))

    if (isImmersive) {
        return (
            <main className="min-h-dvh bg-background">
                <TenantGuard>{children}</TenantGuard>
            </main>
        )
    }

    return (
        <div className="relative overflow-x-clip bg-background">
            <Sidebar />
            <div className="lg:pl-64">
                <Header />
                <div className="relative min-h-[calc(100dvh-4rem)]">
                    <main>
                        <TenantGuard>{children}</TenantGuard>
                    </main>
                    <Onboarding />
                </div>
            </div>
        </div>
    )
}
