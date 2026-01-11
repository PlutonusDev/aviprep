import { Suspense } from "react"
import { HistoryContent } from "./history-content"

export default function HistoryPage() {
  return (
    <Suspense fallback={null}>
      <HistoryContent />
    </Suspense>
  )
}