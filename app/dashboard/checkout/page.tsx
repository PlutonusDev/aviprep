import { Suspense } from "react"
import { FaSpinner } from "react-icons/fa6"
import CheckoutContent from "./checkout-content"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Checkout",
  description:
    "Australia's most comprehensive exam preparation platform. AI-powered insights, thousands of practice questions, and detailed analytics to help you pass first time.",
  openGraph: {
    title: "Master Your Flight Theory with Confidence",
    description:
      "Australia's most comprehensive exam preparation platform. AI-powered insights, thousands of practice questions, and detailed analytics to help you pass first time.",
  },
}

export default () => {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center min-h-[400px]">
                    <FaSpinner className="text-xl animate-spin text-muted-foreground" />
                </div>
            }
        >
            <CheckoutContent />
        </Suspense>
    )
}