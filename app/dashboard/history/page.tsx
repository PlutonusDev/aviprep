import { Suspense } from "react"
import HistoryContent from "./history-content"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "History",
  description:
    "View your exam history, study time analytics, and performance insights.",
}

export default function HistoryPage() {
  return (
    <Suspense fallback={null}>
      <HistoryContent />
    </Suspense>
  )
}