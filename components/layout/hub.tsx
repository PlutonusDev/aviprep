"use client"

import Header from "@/components/hub/header"
import Sidebar from "@/components/hub/sidebar"
import PageTransition from "@/components/meta/page-transition"
import { BackgroundBeams } from "@/ui/background-beams"

export default ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="relative overflow-x-hidden bg-background">
            <Sidebar />
            <div className="lg:pl-64">
                <Header />
                <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
                    <PageTransition />
                    <main>{children}</main>
                </div>
            </div>
            <div className="opacity-0 dark:opacity-70 pointer-events-none top-0 left-0 w-full h-full">
                <BackgroundBeams />
            </div>
        </div>
    )
}