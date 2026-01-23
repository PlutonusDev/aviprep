import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"
import crypto from "crypto"

export async function POST() {
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

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { isFlightSchoolAdmin: true },
    })

    if (!user?.isFlightSchoolAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    const school = await prisma.flightSchool.findUnique({
      where: { adminId: payload.userId },
    })

    if (!school) {
      return NextResponse.json({ error: "Flight school not found" }, { status: 404 })
    }

    // Check subscription tier
    if (school.subscriptionTier === "basic") {
      return NextResponse.json(
        { error: "API access requires Pro or Enterprise plan" },
        { status: 403 }
      )
    }

    // Generate new API key
    const newApiKey = `aviprep_${crypto.randomBytes(32).toString("hex")}`

    const updated = await prisma.flightSchool.update({
      where: { id: school.id },
      data: { apiKey: newApiKey, apiEnabled: true },
    })

    return NextResponse.json({
      apiKey: updated.apiKey,
      apiEnabled: updated.apiEnabled,
      webhookUrl: updated.webhookUrl,
      webhookSecret: updated.webhookSecret,
    })
  } catch (error) {
    console.error("Regenerate API key error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
