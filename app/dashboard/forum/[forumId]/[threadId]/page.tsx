import type { Metadata } from "next"
import { Suspense } from "react"
import ThreadContent from "./thread-content"

export const metadata: Metadata = {
  title: "Thread | AviPrep",
  description: "View thread discussion.",
}

function LoadingThread() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}

export default function ThreadPage() {
  return (
    <Suspense fallback={<LoadingThread />}>
      <ThreadContent />
    </Suspense>
  )
}
