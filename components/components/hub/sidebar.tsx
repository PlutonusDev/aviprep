import { usePathname } from "next/navigation";
import { RiDashboardHorizontalFill, RiSettings3Fill } from "react-icons/ri";
import { GiPlaneWing } from "react-icons/gi";
import Link from "next/link";
import { cn } from "lib/utils";
import { FaBrain, FaComputer, FaDoorClosed, FaMedal } from "react-icons/fa6";
import { IoBarChart, IoSettings, IoSparkles } from "react-icons/io5";
import { useUser } from "@lib/user-context";

const navigation = [
    {
        name: "Dashboard",
        href: "/practice",
        icon: RiDashboardHorizontalFill
    },
    {
        name: "Practice Exams",
        href: "/practice/exams",
        icon: FaComputer
    },
    {
        name: "Statistics",
        href: "/practice/statistics",
        icon: IoBarChart
    },
    {
        name: "Exam History",
        href: "/practice/history",
        icon: FaMedal
    },
    {
        name: "AI Insights",
        href: "/practice/insights",
        icon: FaBrain
    }
]

const bottomNav = [
    {
        name: "Upgrade",
        href: "/practice/pricing",
        icon: IoSparkles
    },
    {
        name: "Settings",
        href: "/practice/settings",
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

                <button onClick={logout} className="cursor-pointer flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
                    <FaDoorClosed className="text-lg" />
                    Sign Out
                </button>
            </div>
        </aside>
    )
}