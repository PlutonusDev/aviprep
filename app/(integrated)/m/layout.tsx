import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "AviPrep app",
  robots: { index: false, follow: false },
}

/** Full-height app screens that respect the notch and home indicator. */
export default function IntegratedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      {children}
    </div>
  )
}
