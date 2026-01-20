import type { Metadata } from "next"
import { Suspense } from "react"
import MessagesContent from "./messages-content"

export const metadata: Metadata = {
  title: "Messages | AviPrep",
  description: "Private messages with other members.",
}

function LoadingMessages() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<LoadingMessages />}>
      <MessagesContent />
    </Suspense>
  )
}
