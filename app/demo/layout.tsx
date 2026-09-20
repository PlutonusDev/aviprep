import type { Metadata } from "next"

/**
 * The flight school demo portal.
 *
 * A walkthrough of the school panel for showing to schools and RTOs. It reads
 * from lib/demo/school.ts and never touches the database, so a code is all
 * anyone needs and nothing real is at risk.
 */
export const metadata: Metadata = {
  title: "Flight school demo · AviPrep",
  description: "The AviPrep school panel: students, groups, progress, seats, branding and the API.",
  robots: { index: false, follow: false },
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children
}
