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
  
  if (hostWithoutPort === "localhost" || hostWithoutPort === "127.0.0.1") {
    return null
  }
  
  const mainDomains = [
    "aviprep.com.au",
    "www.aviprep.com.au",
  ]
  
  if (mainDomains.includes(hostWithoutPort)) {
    return null
  }
  
  // Extract subdomain from aviprep.com.au or cplexamhub.com.au
  const aviPrepMatch = hostWithoutPort.match(/^([^.]+)\.aviprep\.com\.au$/)
  if (aviPrepMatch && aviPrepMatch[1] !== "www") {
    return aviPrepMatch[1]
  }
  
  const cplMatch = hostWithoutPort.match(/^([^.]+)\.cplexamhub\.com\.au$/)
  if (cplMatch && cplMatch[1] !== "www") {
    return cplMatch[1]
  }
  
  return null
}
