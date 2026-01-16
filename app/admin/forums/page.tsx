import type { Metadata } from "next"
import { Suspense } from "react"
import ForumsAdminContent from "./forums-admin-content"

export const metadata: Metadata = {
  title: "Forums Management | Admin",
  description: "Manage forum categories and forums.",
}

function LoadingForums() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}

export default function ForumsAdminPage() {
  return (
    <Suspense fallback={<LoadingForums />}>
      <ForumsAdminContent />
    </Suspense>
  )
}
