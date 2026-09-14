import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"
import { getSubjectById } from "@lib/subjects"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = await verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { isFlightSchoolAdmin: true },
    })
    if (!user?.isFlightSchoolAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const school = await prisma.flightSchool.findUnique({
      where: { adminId: payload.userId },
      select: { id: true },
    })
    if (!school) return NextResponse.json({ error: "No school" }, { status: 404 })

    const purchases = await prisma.schoolPurchase.findMany({
      where: { flightSchoolId: school.id },
      orderBy: { purchasedAt: "desc" },
    })

    const now = new Date()

    return NextResponse.json({
      purchases: purchases.map((p) => ({
        id: p.id,
        licenseType: p.licenseType,
        productType: p.productType,
        subjectId: p.subjectId,
        subjectName: p.subjectId ? (getSubjectById(p.subjectId)?.name ?? p.subjectId) : null,
        tier: p.tier,
        totalSeats: p.totalSeats,
        usedSeats: p.usedSeats,
        seatsRemaining: Math.max(0, p.totalSeats - p.usedSeats),
        pricePerSeat: p.pricePerSeat,
        totalPrice: p.totalPrice,
        purchasedAt: p.purchasedAt,
        expiresAt: p.expiresAt,
        isExpired: p.expiresAt < now,
      })),
      totals: {
        seats: purchases.reduce((n, p) => n + p.totalSeats, 0),
        used: purchases.reduce((n, p) => n + p.usedSeats, 0),
        // Expired purchases are excluded: they are history, not capacity.
        activeSeats: purchases
          .filter((p) => p.expiresAt >= now)
          .reduce((n, p) => n + p.totalSeats, 0),
        spend: purchases.reduce((n, p) => n + p.totalPrice, 0),
      },
    })
  } catch (error) {
    console.error("Failed to load school purchases:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
