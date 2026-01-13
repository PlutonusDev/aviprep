import type { Metadata } from "next"
import { Suspense } from "react"
import { QuestionsContent } from "./questions-content"

export const metadata: Metadata = {
  title: "Questions",
}

export default function QuestionsPage() {
  return (
    <Suspense fallback={<QuestionsLoading />}>
      <QuestionsContent />
    </Suspense>
  )
}

function QuestionsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-96 animate-pulse rounded-lg bg-muted" />
    </div>
  )
}
