import { Suspense } from "react"
import HistoryContent from "./history-content"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "AviPrep | History",
  description:
    "View your CPL exam history, study time analytics, and performance insights.",
}

export default function HistoryPage() {
  return (
    <Suspense fallback={null}>
      <HistoryContent />
    </Suspense>
  )
}