import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/hub/page-primitives"
import { CuratorsContent } from "./curators-content"

export const metadata: Metadata = {
  title: "Curators",
}

export default function CuratorsPage() {
  return (
    <Suspense fallback={<PageSkeleton tiles={3} />}>
      <CuratorsContent />
    </Suspense>
  )
}
