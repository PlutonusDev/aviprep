import type { Metadata } from "next"
import { Suspense } from "react"
import SettingsContent from "./settings-content"

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Manage your AviPrep account settings, profile information, notifications, and subscription details.",
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsContent />
    </Suspense>
  )
}

function SettingsLoading() {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <div className="h-8 w-32 bg-secondary rounded animate-pulse" />
        <div className="h-4 w-48 bg-secondary rounded animate-pulse mt-2" />
      </div>
      <div className="h-64 bg-secondary rounded-lg animate-pulse" />
      <div className="h-48 bg-secondary rounded-lg animate-pulse" />
    </div>
  )
}
