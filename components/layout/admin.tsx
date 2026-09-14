"use client"

import { AdminHeader } from "@/components/admin/header"
import { AdminSidebar } from "@/components/admin/sidebar"
import { BackgroundBeams } from "@/ui/background-beams"

export default ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="relative min-h-screen overflow-x-hidden bg-background">
            <AdminSidebar />
            <div className="lg:pl-64">
                <AdminHeader />
                <div className="relative overflow-hidden">
                    <main>{children}</main>
                </div>
            </div>
            <div className="opacity-70 pointer-events-none absolute top-0 left-0 w-screen h-full">
                <BackgroundBeams />
            </div>
        </div>
    )
}