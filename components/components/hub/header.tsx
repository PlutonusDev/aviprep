"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import {
    Bell,
    Menu,
    Search,
    LayoutDashboard,
    BookOpen,
    BarChart3,
    History,
    Settings,
    LogOut,
    Plane,
    BrainCircuit,
    GraduationCap,
    ShoppingCart,
    MessageSquare,
    Mail,
    Cloud,
    Compass,
    Scale,
    Brain,
    Gauge,
    Calculator,
    Lock,
    ArrowRight,
    Command,
    X,
} from "lucide-react"
import { ThemeToggle } from "@/components/meta/theme-toggle"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import Link from "@/components/meta/link"
import { usePathname } from "next/navigation"
import { cn } from "@lib/utils"
import { useUser } from "@lib/user-context"
import { SUBJECTS, LICENSE_TYPES } from "@lib/subjects"
import type React from "react"
import { NotificationsDropdown } from "./notifications-dropdown"

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Practice Exams", href: "/dashboard/exams", icon: BookOpen },
    { name: "Statistics", href: "/dashboard/statistics", icon: BarChart3 },
    { name: "Exam History", href: "/dashboard/history", icon: History },
    { name: "AI Insights", href: "/dashboard/insights", icon: BrainCircuit },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

// Icon mapping for subjects
const subjectIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Plane,
    Cloud,
    Compass,
    Scale,
    Brain,
    Gauge,
    Calculator,
}

// Pages for search
const pages = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, description: "Overview and quick stats" },
    { name: "Learn", href: "/dashboard/learn", icon: GraduationCap, description: "Browse courses and lessons" },
    { name: "Practice Exams", href: "/dashboard/exams", icon: BookOpen, description: "Take practice tests" },
    { name: "Statistics", href: "/dashboard/statistics", icon: BarChart3, description: "View your progress" },
    { name: "Exam History", href: "/dashboard/history", icon: History, description: "Past exam attempts" },
    { name: "AI Insights", href: "/dashboard/insights", icon: BrainCircuit, description: "AI-powered study tips" },
    { name: "Forum", href: "/dashboard/forum", icon: MessageSquare, description: "Community discussions" },
    { name: "Messages", href: "/dashboard/messages", icon: Mail, description: "Private messages" },
    { name: "Pricing", href: "/dashboard/pricing", icon: ShoppingCart, description: "View plans and pricing" },
    { name: "Settings", href: "/dashboard/settings", icon: Settings, description: "Account settings" },
]

interface SearchResult {
    id: string
    name: string
    description?: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    category: "page" | "course" | "exam"
    isLocked?: boolean
    licenseType?: string
    code?: string
}

function CommandSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const router = useRouter()
    const [query, setQuery] = useState("")
    const [purchasedSubjects, setPurchasedSubjects] = useState<string[]>([])
    const inputRef = useRef<HTMLInputElement>(null)

    // Fetch user's purchased subjects
    useEffect(() => {
        async function fetchPurchases() {
            try {
                const res = await fetch("/api/user/subjects")
                if (res.ok) {
                    const data = await res.json()
                    const purchased = data.subjects
                        ?.filter((s: { isPurchased: boolean }) => s.isPurchased)
                        ?.map((s: { id: string }) => s.id) || []
                    setPurchasedSubjects(purchased)
                }
            } catch {
                // Silently fail
            }
        }
        fetchPurchases()
    }, [])

    // Focus input when dialog opens
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 0)
        } else {
            setQuery("")
        }
    }, [open])

    // Build search results
    const results = useMemo(() => {
        const searchQuery = query.toLowerCase().trim()
        const items: SearchResult[] = []

        // Add pages
        pages.forEach((page) => {
            if (
                searchQuery === "" ||
                page.name.toLowerCase().includes(searchQuery) ||
                page.description?.toLowerCase().includes(searchQuery)
            ) {
                items.push({
                    id: `page-${page.href}`,
                    name: page.name,
                    description: page.description,
                    href: page.href,
                    icon: page.icon,
                    category: "page",
                })
            }
        })

        // Add subjects as courses and exams
        SUBJECTS.forEach((subject) => {
            const isLocked = !purchasedSubjects.includes(subject.id)
            const license = LICENSE_TYPES.find((l) => l.id === subject.licenseType)
            const Icon = subjectIconMap[subject.icon] || Plane

            const matchesQuery =
                searchQuery === "" ||
                subject.name.toLowerCase().includes(searchQuery) ||
                subject.code.toLowerCase().includes(searchQuery) ||
                subject.description.toLowerCase().includes(searchQuery) ||
                license?.name.toLowerCase().includes(searchQuery)

            if (matchesQuery && !subject.comingSoon) {
                // Add as course
                items.push({
                    id: `course-${subject.id}`,
                    name: subject.name,
                    description: `${license?.name} Courses`,
                    href: isLocked ? "/dashboard/pricing" : `/dashboard/learn?license=${subject.licenseType}&subject=${subject.id}`,
                    icon: Icon,
                    category: "course",
                    isLocked,
                    licenseType: license?.name,
                    code: subject.code,
                })

                // Add as exam
                items.push({
                    id: `exam-${subject.id}`,
                    name: `${subject.name} Exams`,
                    description: `${license?.name} Practice Exams`,
                    href: isLocked ? "/dashboard/pricing" : `/dashboard/exams/${subject.id}`,
                    icon: Icon,
                    category: "exam",
                    isLocked,
                    licenseType: license?.name,
                    code: subject.code,
                })
            }
        })

        // Sort: unlocked first, then by category (pages > courses > exams), then alphabetically
        return items.sort((a, b) => {
            // Unlocked items first
            if (a.isLocked !== b.isLocked) return a.isLocked ? 1 : -1
            // Pages first
            if (a.category !== b.category) {
                const order = { page: 0, course: 1, exam: 2 }
                return order[a.category] - order[b.category]
            }
            // Alphabetically
            return a.name.localeCompare(b.name)
        })
    }, [query, purchasedSubjects])

    // Group results by category
    const groupedResults = useMemo(() => {
        const groups: Record<string, SearchResult[]> = {
            available: [],
            locked: [],
        }

        results.forEach((result) => {
            if (result.isLocked) {
                groups.locked.push(result)
            } else {
                groups.available.push(result)
            }
        })

        return groups
    }, [results])

    const handleSelect = useCallback(
        (result: SearchResult) => {
            onOpenChange(false)
            router.push(result.href)
        },
        [router, onOpenChange]
    )

    // Keyboard navigation
    const [selectedIndex, setSelectedIndex] = useState(0)
    const flatResults = [...groupedResults.available, ...groupedResults.locked]

    useEffect(() => {
        setSelectedIndex(0)
    }, [query])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault()
            setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1))
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setSelectedIndex((i) => Math.max(i - 1, 0))
        } else if (e.key === "Enter" && flatResults[selectedIndex]) {
            e.preventDefault()
            handleSelect(flatResults[selectedIndex])
        }
    }

    const getCategoryLabel = (category: string) => {
        switch (category) {
            case "page":
                return "Page"
            case "course":
                return "Courses"
            case "exam":
                return "Exams"
            default:
                return category
        }
    }

    const getCategoryColor = (category: string) => {
        switch (category) {
            case "page":
                return "bg-blue-500/10 text-blue-500 border-blue-500/20"
            case "course":
                return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
            case "exam":
                return "bg-amber-500/10 text-amber-500 border-amber-500/20"
            default:
                return "bg-muted text-muted-foreground"
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
                <DialogTitle className="sr-only">Search</DialogTitle>
                {/* Search Input */}
                <div className="flex items-center border-b border-border px-4">
                    <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search courses, exams, pages..."
                        className="flex-1 bg-transparent py-4 px-3 text-base outline-none placeholder:text-muted-foreground"
                    />
                    {query && (
                        <button
                            onClick={() => setQuery("")}
                            className="p-1 rounded-md hover:bg-muted text-muted-foreground -translate-x-8"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Results */}
                <div className="max-h-[60vh] overflow-y-auto">
                    <div className="p-2 space-y-4">
                        {flatResults.length === 0 ? (
                            <div className="py-12 text-center">
                                <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                                <p className="text-muted-foreground">No results found</p>
                                <p className="text-sm text-muted-foreground/70">Try a different search term</p>
                            </div>
                        ) : (
                            <>
                                {/* Available Items */}
                                {groupedResults.available.length > 0 && (
                                    <div className="mb-4">
                                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Pages
                                        </div>
                                        <div className="space-y-1">
                                            {groupedResults.available.map((result, index) => {
                                                const Icon = result.icon
                                                const isSelected = selectedIndex === index
                                                return (
                                                    <button
                                                        key={result.id}
                                                        onClick={() => handleSelect(result)}
                                                        onMouseEnter={() => setSelectedIndex(index)}
                                                        className={cn(
                                                            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                                                            isSelected ? "bg-accent/30" : "hover:bg-accent/20"
                                                        )}
                                                    >
                                                        <div
                                                            className={cn(
                                                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                                                                result.category === "page"
                                                                    ? "bg-primary/10"
                                                                    : "bg-gradient-to-br from-primary/20 to-primary/5"
                                                            )}
                                                        >
                                                            <Icon className="h-5 w-5 text-primary" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                {result.code && (
                                                                    <Badge variant="outline" className="text-xs px-1.5 py-0 shrink-0">
                                                                        {result.code}
                                                                    </Badge>
                                                                )}
                                                                <span className="font-medium text-foreground truncate">
                                                                    {result.name}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-muted-foreground truncate">
                                                                {result.description}
                                                            </p>
                                                        </div>
                                                        <Badge
                                                            variant="outline"
                                                            className={cn("shrink-0 text-[10px] font-medium", getCategoryColor(result.category))}
                                                        >
                                                            {getCategoryLabel(result.category)}
                                                        </Badge>
                                                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Locked Items */}
                                {groupedResults.locked.length > 0 && (
                                    <div>
                                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <Lock className="h-3 w-3" />
                                            Locked Subjects - Get Access
                                        </div>
                                        <div className="space-y-1">
                                            {groupedResults.locked.map((result, index) => {
                                                const Icon = result.icon
                                                const actualIndex = groupedResults.available.length + index
                                                const isSelected = selectedIndex === actualIndex
                                                return (
                                                    <button
                                                        key={result.id}
                                                        onClick={() => handleSelect(result)}
                                                        onMouseEnter={() => setSelectedIndex(actualIndex)}
                                                        className={cn(
                                                            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors opacity-70",
                                                            isSelected ? "bg-accent/50" : "hover:bg-accent/30"
                                                        )}
                                                    >
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                                                            <Icon className="h-5 w-5 text-muted-foreground" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                {result.code && (
                                                                    <Badge variant="outline" className="text-xs px-1.5 py-0 shrink-0 opacity-60">
                                                                        {result.code}
                                                                    </Badge>
                                                                )}
                                                                <span className="font-medium text-foreground/80 truncate">
                                                                    {result.name}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-muted-foreground truncate">
                                                                {result.description}
                                                            </p>
                                                        </div>
                                                        <Badge
                                                            variant="outline"
                                                            className="shrink-0 text-[10px] font-medium bg-muted/50 text-muted-foreground"
                                                        >
                                                            {getCategoryLabel(result.category)}
                                                        </Badge>
                                                        <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <span className="px-1.5 py-0.5 rounded bg-muted">↑↓</span>
                            Navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="px-1.5 py-0.5 rounded bg-muted">↵</span>
                            Select
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="px-1.5 py-0.5 rounded bg-muted">Esc</span>
                            Close
                        </span>
                    </div>
                    <span>{flatResults.length} results</span>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default function Header() {
    const pathname = usePathname()
    const { user, logout } = useUser()
    const [searchOpen, setSearchOpen] = useState(false)

    const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : "??"
    const fullName = user ? `${user.firstName} ${user.lastName}` : "Loading..."

    // Keyboard shortcut to open search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault()
                setSearchOpen(true)
            }
        }
        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [])

    return (
        <>
            <header className="sticky h-16 top-0 z-40 border-b border-border bg-sidebar">
                <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="lg:hidden">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-64 p-0">
                            <div className="flex h-16 items-center gap-2 border-b border-border px-6">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                                    <Plane className="h-5 w-5 text-primary-foreground" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold">AviPrep</span>
                                    <span className="text-xs text-muted-foreground">Pilot Training</span>
                                </div>
                            </div>
                            <nav className="space-y-1 px-3 py-4">
                                {navigation.map((item) => {
                                    const isActive = pathname === item.href
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={cn(
                                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                                isActive
                                                    ? "bg-accent text-foreground"
                                                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                                            )}
                                        >
                                            <item.icon className="h-5 w-5" />
                                            {item.name}
                                        </Link>
                                    )
                                })}
                            </nav>
                        </SheetContent>
                    </Sheet>

                    <div className="flex flex-1 items-center gap-4">
                        {/* Search Button */}
                        <button
                            onClick={() => setSearchOpen(true)}
                            className="hidden md:flex items-center gap-2 w-full max-w-sm h-10 px-4 rounded-lg border border-input bg-background text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                            <Search className="h-4 w-4 shrink-0" />
                            <span className="flex-1 text-left">Search courses, exams, pages...</span>
                            <span className="hidden lg:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                                <Command className="h-3 w-3" />K
                            </span>
                        </button>

                        {/* Mobile search button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden"
                            onClick={() => setSearchOpen(true)}
                        >
                            <Search className="h-5 w-5" />
                            <span className="sr-only">Search</span>
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        <ThemeToggle />

                        <NotificationsDropdown />

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                                    <Avatar className="h-9 w-9">
                                        {user?.profilePicture && (
                                            <AvatarImage src={user.profilePicture || "/placeholder.svg"} alt={fullName} />
                                        )}
                                        <AvatarFallback className="bg-primary text-primary-foreground">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium">{fullName}</p>
                                        <p className="text-xs text-muted-foreground">{user?.email || "Loading..."}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard/settings">
                                        <Settings className="mr-2 h-4 w-4" />
                                        Settings
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={logout}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Sign out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
        </>
    )
}
