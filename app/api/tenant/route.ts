import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { prisma } from "@lib/prisma"
import { getSubdomain } from "@lib/tenant"

export async function GET() {
  try {
    const headersList = await headers()
    const host = headersList.get("host") || ""

    // The middleware forwards this; fall back to parsing the host so the route
    // still works if it is reached outside the matcher.
    const subdomain = headersList.get("x-tenant-subdomain") || getSubdomain(host)

    if (!subdomain) {
      return NextResponse.json({ tenant: null })
    }

    const school = await prisma.flightSchool.findFirst({
      where: {
        OR: [{ subdomain }, { customDomain: host }],
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        subdomain: true,
        logo: true,
        primaryColour: true,
        accentColour: true,
        favicon: true,
        welcomeMessage: true,
        footerText: true,
        hideBranding: true,
        disabledFeatures: true,
      },
    })

    return NextResponse.json({ tenant: school ?? null })
  } catch (error) {
    console.error("Failed to fetch tenant:", error)
    return NextResponse.json({ tenant: null })
  }
}
