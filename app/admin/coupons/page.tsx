import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/hub/page-primitives"
import { CouponsContent } from "./coupons-content"

export const metadata: Metadata = {
  title: "Coupons",
}

export default function CouponsPage() {
  return (
    <Suspense fallback={<PageSkeleton tiles={0} />}>
      <CouponsContent />
    </Suspense>
  )
}
