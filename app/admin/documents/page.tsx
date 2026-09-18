import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/hub/page-primitives"
import { DocumentsContent } from "./documents-content"

export const metadata: Metadata = {
  title: "Paperwork",
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<PageSkeleton tiles={0} />}>
      <DocumentsContent />
    </Suspense>
  )
}
