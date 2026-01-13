import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { verifyAdmin } from "app/api/admin/middleware"

export async function GET() {
  const adminCheck = await verifyAdmin()
  if ("error" in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
  }

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ coupons })
}

export async function POST(request: NextRequest) {
  const adminCheck = await verifyAdmin()
  if ("error" in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
  }

  const body = await request.json()

  // Check if code already exists
  const existing = await prisma.coupon.findUnique({
    where: { code: body.code },
  })

  if (existing) {
    return NextResponse.json({ error: "Coupon code already exists" }, { status: 400 })
  }

  try {
    const coupon = await prisma.coupon.create({
      data: {
        code: body.code.toUpperCase(),
        discountPercent: body.discountPercent,
        maxUses: body.maxUses,
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
        isActive: body.isActive ?? true,
        applicableProducts: body.applicableProducts || [],
      },
    })

    return NextResponse.json(coupon)
  } catch (error) {
    console.error("Failed to create coupon:", error)
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 })
  }
}
