import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/hub/page-primitives"
import { LibraryContent } from "./library-content"

export const metadata: Metadata = {
  title: "Library",
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<PageSkeleton tiles={4} />}>
      <LibraryContent />
    </Suspense>
  )
}
