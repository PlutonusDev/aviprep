import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/hub/page-primitives"
import { MembersContent } from "./members-content"

export const metadata: Metadata = {
  title: "Members",
}

export default function MembersPage() {
  return (
    <Suspense fallback={<PageSkeleton tiles={0} />}>
      <MembersContent />
    </Suspense>
  )
}
