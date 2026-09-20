import { redirect } from "next/navigation"
import { demoViewer } from "@lib/demo/access"
import { DemoChrome } from "./demo-chrome"

/**
 * The gate. Checked on every navigation rather than once at sign-in, so
 * revoking a grant closes the portal on the next click.
 */
export default async function DemoPortalLayout({ children }: { children: React.ReactNode }) {
  const viewer = await demoViewer()
  if (!viewer) redirect("/demo/access")

  return <DemoChrome organisation={viewer.organisation}>{children}</DemoChrome>
}
