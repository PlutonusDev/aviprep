"use client"

import Header from "@/components/hub/header"
import Sidebar from "@/components/hub/sidebar"
import { usePathname } from "next/navigation"
import { TenantGuard } from "@/components/meta/tenant-guard"
import { ONBOARDING_ENABLED, Onboarding } from "@/components/onboarding/onboarding"
import { EmailVerificationBanner } from "@/components/hub/email-verification-banner"
import { MobileTabBar } from "@/components/hub/mobile-tab-bar"

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
                <EmailVerificationBanner />
                {/* Bottom padding keeps content clear of the mobile tab bar. */}
                <div className="relative min-h-[calc(100dvh-4rem)] pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
                    <main>
                        <TenantGuard>{children}</TenantGuard>
                    </main>
                    {ONBOARDING_ENABLED && <Onboarding />}
                </div>
                <MobileTabBar />
            </div>
        </div>
    )
}
