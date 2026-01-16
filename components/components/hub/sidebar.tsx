import { usePathname } from "next/navigation";
import { RiDashboardHorizontalFill, RiSettings3Fill } from "react-icons/ri";
import { GiPlaneWing } from "react-icons/gi";
import Link from "next/link";
import { cn } from "lib/utils";
import { FaBrain, FaComputer, FaDoorClosed, FaMedal, FaPaperPlane } from "react-icons/fa6";
import { IoBarChart, IoSettings, IoSparkles } from "react-icons/io5";
import { SlSpeech } from "react-icons/sl";
import { useUser } from "@lib/user-context";

const navigation = [
    {
        name: "Dashboard",
        href: "/dashboard",
        icon: RiDashboardHorizontalFill
    },
    {
        name: "Practice Exams",
        href: "/dashboard/exams",
        icon: FaComputer
    },
    {
        name: "Statistics",
        href: "/dashboard/statistics",
        icon: IoBarChart
    },
    {
        name: "Exam History",
        href: "/dashboard/history",
        icon: FaMedal
    },
    {
        name: "AI Insights",
        href: "/dashboard/insights",
        icon: FaBrain
    },
    {
        name: "Forums",
        href: "/dashboard/forum",
        icon: SlSpeech
    },
    {
        name: "Messages",
        href: "/dashboard/messages",
        icon: FaPaperPlane
    }
]

const bottomNav = [
    {
        name: "Upgrade",
        href: "/dashboard/pricing",
        icon: IoSparkles
    },
    {
        name: "Settings",
        href: "/dashboard/settings",
        icon: IoSettings
    }
]

export default () => {
    const { logout } = useUser();
    const pathname = usePathname();

    return (
        <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-border bg-sidebar lg:flex">
            <div className="flex h-16 items-center gap-2 border-b border-border px-6 justify-center">
                <img className="h-10" src="/img/AviPrep-logo.png" />
            </div>

            <nav className="flex-1 space-y-1 px-3 py-4">
                {navigation.map(item => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.name} href={item.href} className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                            isActive ? "bg-sidebar-accent text-sidebar-foreground"
                            : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                        )}>
                            <item.icon className="text-lg" />
                            {item.name}
                        </Link>
                    )
                })}
            </nav>

            <div className="border-t border-border px-3 py-4">
                {bottomNav.map(item => (
                    <Link key={item.name} href={item.href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
                        <item.icon className="text-lg" />
                        {item.name}
                    </Link>
                ))}

                <Link href="/admin" className="cursor-pointer flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
                    <GiPlaneWing className="text-lg" />
                    Admin Panel
                </Link>

                <button onClick={logout} className="cursor-pointer flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
                    <FaDoorClosed className="text-lg" />
                    Sign Out
                </button>
            </div>
        </aside>
    )
}