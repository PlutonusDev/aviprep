import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"

/** Marks the welcome tour finished. Skipping counts as finished. */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = await verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    // reset: true lets someone replay the tour from settings.
    const onboardedAt = body?.reset ? null : new Date()

    await prisma.user.update({
      where: { id: payload.userId },
      data: { onboardedAt },
    })

    return NextResponse.json({ onboardedAt })
  } catch (error) {
    console.error("Failed to update onboarding state:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
