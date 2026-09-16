import type { Metadata } from "next"
import { AIQuestionGenerator } from "./ai-generator"

export const metadata: Metadata = {
  title: "AI generator",
}

export default function GeneratePage() {
  return <AIQuestionGenerator />
}
