import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"

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
      name: school.name,
      email: school.email,
      phone: school.phone,
      address: school.address,
      city: school.city,
      state: school.state,
      postcode: school.postcode,
      website: school.website,
      logo: school.logo,
      subscriptionTier: school.subscriptionTier,
      subscriptionExpiry: school.subscriptionExpiry,
      maxStudents: school.maxStudents,
      // Branding fields
      subdomain: school.subdomain,
      customDomain: school.customDomain,
      primaryColour: school.primaryColour,
      accentColour: school.accentColour,
      favicon: school.favicon,
      loginBackground: school.loginBackground,
      welcomeMessage: school.welcomeMessage,
      footerText: school.footerText,
      hideBranding: school.hideBranding,
    })
  } catch (error) {
    console.error("Get school settings error:", error)
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

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    // Only allow updating certain fields
    const allowedFields = [
      "name", "phone", "address", "city", "state", "postcode", "website", "logo",
      // Branding fields
      "subdomain", "primaryColour", "accentColour", "favicon", 
      "loginBackground", "welcomeMessage", "footerText", "hideBranding"
    ]
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    // Validate subdomain if provided
    if (updates.subdomain) {
      const subdomain = String(updates.subdomain).toLowerCase().replace(/[^a-z0-9-]/g, "")
      if (subdomain.length < 3) {
        return NextResponse.json({ error: "Subdomain must be at least 3 characters" }, { status: 400 })
      }
      // Check if subdomain is taken by another school
      const existing = await prisma.flightSchool.findFirst({
        where: {
          subdomain,
          NOT: { id: school.id }
        }
      })
      if (existing) {
        return NextResponse.json({ error: "This subdomain is already taken" }, { status: 400 })
      }
      updates.subdomain = subdomain
    }

    const updated = await prisma.flightSchool.update({
      where: { id: school.id },
      data: updates,
    })

    return NextResponse.json({
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      address: updated.address,
      city: updated.city,
      state: updated.state,
      postcode: updated.postcode,
      website: updated.website,
      logo: updated.logo,
      subscriptionTier: updated.subscriptionTier,
      subscriptionExpiry: updated.subscriptionExpiry,
      maxStudents: updated.maxStudents,
      // Branding fields
      subdomain: updated.subdomain,
      customDomain: updated.customDomain,
      primaryColour: updated.primaryColour,
      accentColour: updated.accentColour,
      favicon: updated.favicon,
      loginBackground: updated.loginBackground,
      welcomeMessage: updated.welcomeMessage,
      footerText: updated.footerText,
      hideBranding: updated.hideBranding,
    })
  } catch (error) {
    console.error("Update school settings error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
