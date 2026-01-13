import type { Metadata } from "next"
import { Suspense } from "react"
import { MembersContent } from "./members-content"

export const metadata: Metadata = {
  title: "Members",
}

export default function MembersPage() {
  return (
    <Suspense fallback={<MembersLoading />}>
      <MembersContent />
    </Suspense>
  )
}

function MembersLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-96 animate-pulse rounded-lg bg-muted" />
    </div>
  )
}
