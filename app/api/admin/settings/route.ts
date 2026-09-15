import { NextResponse } from "next/server"
import { verifyAdmin } from "app/api/admin/middleware"
import { getRegistrationSetting, setRegistrationSetting } from "@lib/site-settings"

export async function GET() {
  const admin = await verifyAdmin()
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status })
  return NextResponse.json({ registration: await getRegistrationSetting() })
}

export async function PATCH(request: Request) {
  const admin = await verifyAdmin()
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status })

  const body = await request.json().catch(() => ({}))
  if (!body.registration || typeof body.registration.open !== "boolean") {
    return NextResponse.json({ error: "Invalid settings" }, { status: 400 })
  }

  const registration = await setRegistrationSetting(body.registration, admin.userId)
  return NextResponse.json({ registration })
}
