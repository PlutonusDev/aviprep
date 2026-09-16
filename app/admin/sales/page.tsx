import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/hub/page-primitives"
import { SalesContent } from "./sales-content"

export const metadata: Metadata = {
  title: "Sales",
}

export default function SalesPage() {
  return (
    <Suspense fallback={<PageSkeleton tiles={4} />}>
      <SalesContent />
    </Suspense>
  )
}
