import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@lib/auth"
import { prisma } from "@lib/prisma"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { isAdmin: true },
    })

    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Fetch stats
    const [totalMembers, totalQuestions, purchases, activeSubscriptions] = await Promise.all([
      prisma.user.count(),
      prisma.question.count(),
      prisma.purchase.aggregate({
        _sum: { priceAud: true },
      }),
      prisma.user.count({
        where: {
          hasBundle: true,
          bundleExpiry: { gt: new Date() },
        },
      }),
    ])

    return NextResponse.json({
      totalMembers,
      totalQuestions,
      totalRevenue: purchases._sum.priceAud ?? 0,
      activeSubscriptions,
    })
  } catch (error) {
    console.error("Admin stats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
