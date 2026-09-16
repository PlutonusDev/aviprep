import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { CURATOR_COOKIE } from "@lib/curators/session"

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete("session")
  // Only ever present on the curators subdomain.
  cookieStore.delete(CURATOR_COOKIE)

  return NextResponse.json({ success: true })
}
