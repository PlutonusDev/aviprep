"use client";

import "../components/globals.css";

import { Toaster } from "@/components/ui/sonner";

export default ({ children }: { children: React.ReactNode }) => {
    return (
        <html lang="en">
            <body className="antialiased overflow-x-hidden">
                {children}
                <Toaster />
            </body>
        </html>
    )
}