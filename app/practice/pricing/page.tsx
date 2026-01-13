import type { Metadata } from "next"
import PricingContent from "./pricing-content"

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Get access to CPL Exam Hub practice exams. Choose individual subjects or the complete CPL Bundle subscription with AI insights and premium features.",
  openGraph: {
    title: "Pricing | CPL Exam Hub",
    description: "Affordable CPL theory exam preparation. Individual subjects from $39 or full bundle for $110/quarter.",
  },
}

export default function PricingPage() {
  return <PricingContent />
}
