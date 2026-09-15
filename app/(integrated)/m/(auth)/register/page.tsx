import { redirect } from "next/navigation"

/**
 * The installed app's scope covers the whole site, so sign-up now happens in the
 * app itself rather than opening a browser tab.
 */
export default function MobileRegister() {
  redirect("/register")
}
