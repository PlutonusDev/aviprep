"use client"

import Header from "@/components/hub/header"
import Sidebar from "@/components/hub/sidebar"
import PageTransition from "@/components/meta/page-transition"
import { BackgroundBeams } from "@/ui/background-beams"

export default ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="relative min-h-screen overflow-x-hidden bg-background">
            <Sidebar />
            <div className="lg:pl-64">
                <Header />
                <div className="relative overflow-hidden">
                    <PageTransition />
                    <main className="pb-20 lg:pb-8">{children}</main>
                </div>
            </div>
            <div className="opacity-70 pointer-events-none absolute top-0 left-0 w-screen h-full">
                <BackgroundBeams />
            </div>
        </div>
    )
}