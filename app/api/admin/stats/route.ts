import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@lib/auth"
import { prisma } from "@lib/prisma"
import { notAccepted, notRevoked } from "@lib/curators/invites"
import { reviewQueue } from "@lib/review/review"

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
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const [
      totalMembers,
      newMembers,
      totalQuestions,
      purchases,
      activeSubscriptions,
      waitlistCount,
      reviewItems,
      mosReviews,
      rtoContacts,
      curatorInvites,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
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
      prisma.waitlist.count(),
      // Same list the review page shows, so the numbers always agree.
      reviewQueue(),
      prisma.mosMapping.count({ where: { needsReview: true } }),
      prisma.rtoContact.count(),
      prisma.curatorInvite.count({ where: { expiresAt: { gt: new Date() }, AND: [notAccepted, notRevoked] } }),
    ])

    return NextResponse.json({
      totalMembers,
      newMembers,
      totalQuestions,
      totalRevenue: purchases._sum.priceAud ?? 0,
      activeSubscriptions,
      waitlistCount,
      rtoContacts,
      queue: {
        review: reviewItems.length,
        newContent: reviewItems.filter((i) => i.kind === "new").length,
        edits: reviewItems.filter((i) => i.kind === "edit").length,
        mosReviews,
        curatorInvites,
      },
    })
  } catch (error) {
    console.error("Admin stats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
