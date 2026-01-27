import type { Metadata } from "next"
import ExamsContent from "./exams-content"

export const metadata: Metadata = {
  title: "AviPrep | Practice Exams",
  description:
    "Access your CASA CPL theory practice exams across all 7 subjects including Aerodynamics, Meteorology, Navigation, Air Law, and more.",
}

export default function ExamsPage() {
  return <ExamsContent />
}
