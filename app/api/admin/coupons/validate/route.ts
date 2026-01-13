import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@lib/prisma"

export async function POST(request: NextRequest) {
  const { code } = await request.json()

  if (!code) {
    return NextResponse.json({ valid: false, error: "No code provided" })
  }

  const coupon = await prisma.coupon.findUnique({
    where: { code: code.toUpperCase() },
  })

  if (!coupon) {
    return NextResponse.json({ valid: false, error: "Invalid coupon code" })
  }

  if (!coupon.isActive) {
    return NextResponse.json({ valid: false, error: "This coupon is no longer active" })
  }

  if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) {
    return NextResponse.json({ valid: false, error: "This coupon has expired" })
  }

  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return NextResponse.json({ valid: false, error: "This coupon has reached its usage limit" })
  }

  return NextResponse.json({
    valid: true,
    discountPercent: coupon.discountPercent,
    code: coupon.code,
  })
}
