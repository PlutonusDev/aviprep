import type { Metadata } from "next"
import ChooseSubjectContent from "./choose-subject-content"

export const metadata: Metadata = {
  title: "Choose your free subject",
  robots: { index: false, follow: false },
}

export default function ChooseSubjectPage() {
  return <ChooseSubjectContent />
}
