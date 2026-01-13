import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { verifyAdmin } from "app/api/admin/middleware"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await verifyAdmin()
  if ("error" in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
  }

  const { id } = await params
  const body = await request.json()

  try {
    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        code: body.code?.toUpperCase(),
        discountPercent: body.discountPercent,
        maxUses: body.maxUses,
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
        isActive: body.isActive,
      },
    })

    return NextResponse.json(coupon)
  } catch (error) {
    console.error("Failed to update coupon:", error)
    return NextResponse.json({ error: "Failed to update coupon" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await verifyAdmin()
  if ("error" in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
  }

  const { id } = await params

  try {
    await prisma.coupon.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete coupon:", error)
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 })
  }
}
