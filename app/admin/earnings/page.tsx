import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/hub/page-primitives"
import { EarningsContent } from "./earnings-content"

export const metadata: Metadata = {
  title: "Earnings",
}

export default function EarningsPage() {
  return (
    <Suspense fallback={<PageSkeleton tiles={3} />}>
      <EarningsContent />
    </Suspense>
  )
}
