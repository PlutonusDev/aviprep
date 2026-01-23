import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"
import crypto from "crypto"

async function getSchoolForAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isFlightSchoolAdmin: true },
  })

  if (!user?.isFlightSchoolAdmin) return null

  return prisma.flightSchool.findUnique({
    where: { adminId: userId },
  })
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const school = await getSchoolForAdmin(payload.userId)
    if (!school) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    return NextResponse.json({
      apiKey: school.apiKey,
      apiEnabled: school.apiEnabled,
      webhookUrl: school.webhookUrl,
      webhookSecret: school.webhookSecret,
    })
  } catch (error) {
    console.error("Get API settings error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const school = await getSchoolForAdmin(payload.userId)
    if (!school) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    // Check subscription tier
    if (school.subscriptionTier === "basic") {
      return NextResponse.json(
        { error: "API access requires Pro or Enterprise plan" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (typeof body.apiEnabled === "boolean") {
      updates.apiEnabled = body.apiEnabled
    }

    if (typeof body.webhookUrl === "string") {
      updates.webhookUrl = body.webhookUrl || null

      // Generate webhook secret if URL is set and no secret exists
      if (body.webhookUrl && !school.webhookSecret) {
        updates.webhookSecret = crypto.randomBytes(32).toString("hex")
      }
    }

    const updated = await prisma.flightSchool.update({
      where: { id: school.id },
      data: updates,
    })

    return NextResponse.json({
      apiKey: updated.apiKey,
      apiEnabled: updated.apiEnabled,
      webhookUrl: updated.webhookUrl,
      webhookSecret: updated.webhookSecret,
    })
  } catch (error) {
    console.error("Update API settings error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
