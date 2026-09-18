import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/hub/page-primitives"
import { CommunityContent } from "./community-content"

export const metadata: Metadata = {
  title: "Community",
}

export default function CommunityPage() {
  return (
    <Suspense fallback={<PageSkeleton tiles={0} />}>
      <CommunityContent />
    </Suspense>
  )
}
