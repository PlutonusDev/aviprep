"use client";
import { FloatingDock } from "@/ui/floating-dock";
import { BookOpen, ChartNoAxesColumn, ClipboardCheck, Home } from "lucide-react"

export default () => {
    const links = [
        {
            title: "Home",
            icon: <Home className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
            href: "/m/dashboard"
        }, {
            title: "Courses",
            icon: <BookOpen className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
            href: "/m/dashboard/learn"
        }, {
            title: "Exams",
            icon: <ClipboardCheck className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
            href: "/m/dashboard/exams"
        }, {
            title: "Stats",
            icon: <ChartNoAxesColumn className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
            href: "/m/dashboard/history"
        }
    ];

    return (
        <div className="absolute h-screen w-full flex items-end justify-end -translate-x-4 -translate-y-6 h-[35rem]">
            <FloatingDock
                mobileClassName="text-xl"
                items={links}
            />
        </div>
    );
}