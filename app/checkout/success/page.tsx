import { Suspense } from "react"
import SuccessContent from "./success-content"

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  )
}