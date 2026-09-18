import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/hub/page-primitives"
import { DiagramsContent } from "./diagrams-content"

export const metadata: Metadata = {
  title: "Diagrams",
}

export default function DiagramsPage() {
  return (
    <Suspense fallback={<PageSkeleton tiles={0} />}>
      <DiagramsContent />
    </Suspense>
  )
}
