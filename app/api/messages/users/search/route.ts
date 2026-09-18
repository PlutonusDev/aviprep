import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"
import { cookies } from "next/headers"

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""

    if (!query || query.length < 2) {
      return NextResponse.json([])
    }

    // Names match partially; email only matches exactly. Partial email search
    // let anyone enumerate every member's address a few letters at a time.
    const terms = query.trim().split(/\s+/).slice(0, 3)
    const nameMatch = terms.map((t) => ({
      OR: [
        { firstName: { contains: t, mode: "insensitive" as const } },
        { lastName: { contains: t, mode: "insensitive" as const } },
      ],
    }))

    const users = await prisma.user.findMany({
      where: {
        id: { not: payload.userId },
        OR: [{ AND: nameMatch }, { email: { equals: query.trim(), mode: "insensitive" } }],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        isCurator: true,
        curatorCredential: true,
      },
      take: 10,
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error searching users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
