import { usePathname } from "next/navigation"
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import { GiHamburgerMenu } from "react-icons/gi";
import { FaBrain, FaComputer, FaMagnifyingGlass, FaMedal, FaPlane } from "react-icons/fa6";
import { RiDashboardHorizontalFill } from "react-icons/ri";
import { IoBarChart, IoSettings } from "react-icons/io5";
import { AiFillNotification } from "react-icons/ai";
import { PiSignOutBold } from "react-icons/pi";
import Link from "next/link";
import { cn } from "lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
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
        name: "Settings",
        href: "/dashboard/settings",
        icon: IoSettings
    }
]

export default () => {
    const pathname = usePathname();
    const { user, logout } = useUser();

    const initials = user ? `${user.firstName[0].toUpperCase()}${user.lastName[0].toUpperCase()}` : "??";
    const fullName = user ? `${user.firstName} ${user.lastName}` : "User";

    return (
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-[63px] items-center gap-4 px-4 lg:px-6">
                <Sheet>
                    <SheetTrigger asChild>
                        <div className="lg:hidden flex items-center justify-center rounded-md border border-border-foreground cursor-pointer transition-all">
                            <GiHamburgerMenu className="text-lg" />
                            <span className="sr-only">Toggle menu</span>
                        </div>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-64 p-0">
                        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
                            <FaPlane className="text-lg" />
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold">AviPrep</span>
                                <span className="text-xs text-muted-foreground">Study Hub</span>
                            </div>
                        </div>
                        <nav className="space-y-1 px-3 py-4">
                            {navigation.map(item => {
                                const isActive = pathname === item.href;

                                return (
                                    <Link key={item.name} href={item.href} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                        isActive ?
                                        "bg-primary text-foreground" :
                                        "text-muted-foreground hover:bg-primary/50 hover:text-foreground",
                                    )}>
                                        <item.icon className="text-lg" />
                                        {item.name}
                                    </Link>
                                )
                            })}
                        </nav>
                    </SheetContent>
                </Sheet>

                <div className="flex flex-1 items-center gap-4">
                    <div className="relative hidden w-full max-w-sm md:block">
                        <FaMagnifyingGlass className="absolute top-[7px] ml-2 text-white/50" />
                        <input className="pl-9 py-1 pr-6 rounded-md bg-secondary text-sm border border-border" placeholder="Search subjects, topics..." />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="rounded-md relative">
                        <AiFillNotification className="text-xl" />
                        <span className="absolute -right-[2px] top-0 h-[9px] w-[9px] rounded-full bg-primary border border-border" />
                        <span className="sr-only">Notifications</span>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <div className="relative h-9 w-9 rounded-full cursor-pointer">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={user?.profilePicture || undefined} alt={user?.firstName} />
                                    <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
                                </Avatar>
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium">{fullName}</p>
                                    <p className="text-xs text-muted-foreground">{user?.email || "Loading..."}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <Link href="/dashboard/settings">
                                <DropdownMenuItem className="cursor-pointer">
                                    <IoSettings className="mr-1 text-lg" />
                                    Settings
                                </DropdownMenuItem>
                            </Link>
                            <DropdownMenuItem onClick={logout} className="cursor-pointer">
                                <PiSignOutBold className="mr-1 text-lg" />
                                Sign Out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    )
}