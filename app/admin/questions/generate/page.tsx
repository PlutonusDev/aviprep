import type { Metadata } from "next"
import { AIQuestionGenerator } from "./ai-generator"

export const metadata: Metadata = {
  title: "AI Question Generator",
}

export default function GeneratePage() {
  return <AIQuestionGenerator />
}
