import type { Metadata } from "next"
import BrandingContent from "./branding-content"

export const metadata: Metadata = {
  title: "Card artwork",
  description: "Generate branded header images for subject and course cards.",
}

export default function BrandingPage() {
  return <BrandingContent />
}
