import { redirect } from "next/navigation"

/**
 * The installed app uses the real dashboard, so every old /m/dashboard/* link
 * (bookmarks, notifications, earlier app versions) lands on its counterpart.
 */
export default async function MobileDashboardRedirect({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params
  const rest = (path ?? []).map(encodeURIComponent).join("/")
  redirect(rest ? `/dashboard/${rest}` : "/dashboard")
}
