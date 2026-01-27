import type { Metadata } from "next"
import { Suspense } from "react"
import ForumContent from "./forum-content"

export const metadata: Metadata = {
  title: "AviPrep | Forums",
  description: "Connect with fellow student pilots, share study tips, and discuss exam topics.",
}

function LoadingForum() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}

export default function ForumPage() {
  return (
    <Suspense fallback={<LoadingForum />}>
      <ForumContent />
    </Suspense>
  )
}
