import { Suspense } from "react"
import { FaSpinner } from "react-icons/fa6"
import CheckoutContent from "./checkout-content"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "AviPrep | Checkout",
  description:
    "Australia's #1 CASA CPL exam preparation platform. 5,000+ practice questions across 7 theory subjects, AI-powered insights, and detailed analytics. Join 500+ pilots on the waitlist.",
  openGraph: {
    title: "AviPrep | Master Your Flight Theory with Confidence",
    description:
      "Join 500+ aspiring pilots. 5,000+ questions, AI insights, 95% pass rate. Be the first to know when we launch.",
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