import type { Metadata } from "next"
import DashboardContent from "./dashboard-content"

export const metadata: Metadata = {
  title: "AviPrep | Dashboard",
  description: "Your AviPrep dashboard - view your subjects, recent exams, and study progress.",
}

export default function DashboardPage() {
  return <DashboardContent />
}
