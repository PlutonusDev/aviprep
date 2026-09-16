import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/hub/page-primitives"
import ForumsAdminContent from "./forums-admin-content"

export const metadata: Metadata = {
  title: "Forums",
  description: "Manage forum categories and forums.",
}

function LoadingForums() {
  return <PageSkeleton tiles={0} />
}

export default function ForumsAdminPage() {
  return (
    <Suspense fallback={<LoadingForums />}>
      <ForumsAdminContent />
    </Suspense>
  )
}
