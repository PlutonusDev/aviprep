import { Suspense } from "react"
import SuccessContent from "./success-content"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Checkout",
  description:
    "Australia's most comprehensive exam preparation platform. AI-powered insights, thousands of practice questions, and detailed analytics to help you pass first time.",
  openGraph: {
    title: "AviPrep | Master Your Flight Theory with Confidence",
    description:
      "Australia's most comprehensive exam preparation platform. AI-powered insights, thousands of practice questions, and detailed analytics to help you pass first time.",
  },
}

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