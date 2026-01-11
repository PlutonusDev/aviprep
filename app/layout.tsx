"use client";

import { type AppProps } from "next/app";
import "../components/globals.css";

import BaseLayout from "@/layout/base";
import HubLayout from "@/layout/hub";
import { Toaster } from "@/components/ui/sonner";
import { usePathname } from "next/navigation";

export default ({ children }: { children: React.ReactNode }) => {
    const path = usePathname();

    return path === "/" || path.startsWith("/#") ? (
        <html lang="en">
            <body className="antialiased">
                <BaseLayout>
                    {children}
                    <Toaster />
                </BaseLayout>
            </body>
        </html>
    ) : (
        <html lang="en">
            <body className="antialiased">
                <HubLayout>
                    {children}
                    <Toaster />
                </HubLayout>
            </body>
        </html>
    )
}