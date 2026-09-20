import type { Metadata } from "next"
import { DemoChrome } from "./demo-chrome"

/**
 * The flight school demo portal.
 *
 * A walkthrough of the school panel for showing to schools and RTOs. It reads
 * from lib/demo/school.ts and never touches the database, so it can be opened
 * by anyone, from anywhere, without a login and without risk.
 */

export const metadata: Metadata = {
  title: "Flight school demo · AviPrep",
  description: "A walk through the AviPrep school panel: students, groups, progress, seats, branding and the API.",
  robots: { index: false, follow: false },
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <DemoChrome>{children}</DemoChrome>
}
