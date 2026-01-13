import type { Metadata } from "next"
import { Suspense } from "react"
import { CouponsContent } from "./coupons-content"

export const metadata: Metadata = {
  title: "Coupons",
}

export default function CouponsPage() {
  return (
    <Suspense fallback={<CouponsLoading />}>
      <CouponsContent />
    </Suspense>
  )
}

function CouponsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-96 animate-pulse rounded-lg bg-muted" />
    </div>
  )
}
