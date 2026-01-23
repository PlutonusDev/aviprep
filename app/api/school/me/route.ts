import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"

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

    // Get the user
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        isFlightSchoolAdmin: true,
      },
    })

    if (!user || !user.isFlightSchoolAdmin) {
      return NextResponse.json({ error: "Not a flight school admin" }, { status: 403 })
    }

    // Get the flight school they manage
    const school = await prisma.flightSchool.findUnique({
      where: { adminId: user.id },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        postcode: true,
        website: true,
        logo: true,
        isActive: true,
        maxStudents: true,
        apiKey: true,
        apiEnabled: true,
        webhookUrl: true,
        subscriptionTier: true,
        subscriptionExpiry: true,
      },
    })

    if (!school) {
      return NextResponse.json({ error: "Flight school not found" }, { status: 404 })
    }

    // Get student count
    const studentCount = await prisma.user.count({
      where: { flightSchoolId: school.id },
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
      },
      school: {
        ...school,
        apiKey: school.apiKey ? `${school.apiKey.slice(0, 8)}...` : null, // Mask API key
      },
      studentCount,
    })
  } catch (error) {
    console.error("School me error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
