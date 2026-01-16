import type React from "react"
import type { Metadata } from "next"
import { AdminSidebar } from "@/components/admin/sidebar"
import { AdminHeader } from "@/components/admin/header"

export const metadata: Metadata = {
  title: {
    default: "Admin Dashboard",
    template: "%s | AviPrep Admin",
  },
  description: "Admin dashboard for managing AviPrep",
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <div className="lg:pl-64">
        <AdminHeader />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
