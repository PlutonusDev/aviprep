import type { Metadata } from "next"
import InsightsContent from "./insights-content"

export const metadata: Metadata = {
  title: "Insights",
  description:
    "View AI-powered personalized study recommendations, weak point analysis, and performance insights for your CPL exam preparation.",
}

export default function InsightsPage() {
  return <InsightsContent />
}
