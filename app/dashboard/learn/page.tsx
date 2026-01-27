import type { Metadata } from "next"
import LearnContent from "./learn-content"

export const metadata: Metadata = {
  title: "AviPrep | Learn",
  description:
    "Access comprehensive aviation ground school courses, interactive study modules, and [expert-curated materials] designed to master your theoretical knowledge for PPL, CPL, and ATPL exams.",
}

export default function InsightsPage() {
  return <LearnContent />
}
