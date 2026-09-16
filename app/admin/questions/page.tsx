import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/hub/page-primitives"
import { QuestionsContent } from "./questions-content"

export const metadata: Metadata = {
  title: "Questions",
}

export default function QuestionsPage() {
  return (
    <Suspense fallback={<PageSkeleton tiles={0} />}>
      <QuestionsContent />
    </Suspense>
  )
}
