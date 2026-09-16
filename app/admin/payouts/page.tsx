import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/hub/page-primitives"
import { PayoutsContent } from "./payouts-content"

export const metadata: Metadata = {
  title: "Curator payouts",
}

export default function PayoutsPage() {
  return (
    <Suspense fallback={<PageSkeleton tiles={4} />}>
      <PayoutsContent />
    </Suspense>
  )
}
