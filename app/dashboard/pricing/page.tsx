import type { Metadata } from "next"
import { Suspense } from "react"
import PricingContent from "./pricing-content"
import { Loader2 } from "lucide-react"

export const metadata: Metadata = {
  title: "AviPrep",
  description:
    "Get access to AviPrep pilot exam preparation. Choose from RPL, PPL, and CPL courses with individual subjects or complete bundle subscriptions.",
  openGraph: {
    title: "Pricing | AviPrep",
    description: "Affordable pilot theory exam preparation. RPL, PPL, and CPL courses with flexible pricing options.",
  },
}

function PricingLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={<PricingLoading />}>
      <PricingContent />
    </Suspense>
  )
}
