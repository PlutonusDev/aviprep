import type { Metadata } from "next"
import StatisticsContent from "./statistics-content"

export const metadata: Metadata = {
  title: "Statistics & Analytics",
  description:
    "View your CPL exam performance statistics, score trends, study time analytics, and subject-by-subject breakdowns.",
}

export default function StatisticsPage() {
  return <StatisticsContent />
}
