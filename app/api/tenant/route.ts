import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { prisma } from "@lib/prisma"

export async function GET() {
  try {
    const headersList = await headers()
    const host = headersList.get("host") || ""
    
    const subdomain = getSubdomain(host)
    
    if (!subdomain) {
      // No subdomain, return null tenant (main site)
      return NextResponse.json({ tenant: null })
    }
    
    // Look up school by subdomain or custom domain
    const school = await prisma.flightSchool.findFirst({
      where: {
        OR: [
          { subdomain: subdomain },
          { customDomain: host },
        ],
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
      },
    })
    
    if (!school) {
      return NextResponse.json({ tenant: null })
    }
    
    return NextResponse.json({ tenant: school })
  } catch (error) {
    console.error("Failed to fetch tenant:", error)
    return NextResponse.json({ tenant: null })
  }
}

function getSubdomain(host: string): string | null {
  const hostWithoutPort = host.split(":")[0]
  
  /*if (hostWithoutPort === "localhost" || hostWithoutPort === "127.0.0.1") {
    return null
  }*/
  
  const mainDomains = [
    "aviprep.com.au",
    "www.aviprep.com.au",
    "localhost"
  ]
  
  if (mainDomains.includes(hostWithoutPort)) {
    return null
  }
  
  for (const domain of mainDomains) {
    if (hostWithoutPort.endsWith(`.${domain}`)) {
      const subdomain = hostWithoutPort.split(`.${domain}`)[0];

      if (subdomain && subdomain !== "www") {
        return subdomain;
      }
    }
  }
  
  return null
}
