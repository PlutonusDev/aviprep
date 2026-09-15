import { NextResponse } from "next/server"
import { getRegistrationSetting } from "@lib/site-settings"

export const dynamic = "force-dynamic"

/** Public: whether sign-up is open, so the pages can say so before anyone fills in a form. */
export async function GET() {
  const { open, message } = await getRegistrationSetting()
  return NextResponse.json({ open, message: open ? "" : message })
}
