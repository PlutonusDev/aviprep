import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/hub/page-primitives"
import { ReviewWorkspace } from "./review-workspace"

export const metadata: Metadata = {
  title: "Review",
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<PageSkeleton tiles={0} />}>
      <ReviewWorkspace />
    </Suspense>
  )
}
