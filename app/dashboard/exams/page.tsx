import type { Metadata } from "next"
import ExamsContent from "./exams-content"

export const metadata: Metadata = {
  title: "Practice Exams",
  description:
    "Australia's most comprehensive exam preparation platform. AI-powered insights, thousands of practice questions, and detailed analytics to help you pass first time.",
}

export default function ExamsPage() {
  return <ExamsContent />
}
