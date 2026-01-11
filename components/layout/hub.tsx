import Header from "@/components/hub/header"
import Sidebar from "@/components/hub/sidebar"
import { BackgroundBeams } from "@/ui/background-beams"

export default ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="relative min-h-screen bg-background">
            <Sidebar />
            <div className="lg:pl-64">
                <Header />
                <main className="pb-20 lg:pb-8">{children}</main>
            </div>
            <div className="opacity-70 pointer-events-none absolute top-0 left-0 w-screen h-full">
                <BackgroundBeams />
            </div>
        </div>
    )
}