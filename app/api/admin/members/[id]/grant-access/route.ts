import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { verifyAdmin } from "app/api/admin/middleware"
import { SUBJECTS } from "@lib/products"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await verifyAdmin()
  if ("error" in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
  }

  const { id } = await params
  const { subjectId } = await request.json()

  const subject = SUBJECTS.find((s) => s.id === subjectId)
  if (!subject) {
    return NextResponse.json({ error: "Invalid subject" }, { status: 400 })
  }

  try {
    const purchase = await prisma.purchase.upsert({
      where: {
        userId_subjectId: { userId: id, subjectId },
      },
      create: {
        userId: id,
        subjectId,
        subjectName: subject.name,
        subjectCode: subject.code,
        purchaseType: "individual",
        priceAud: 0, // Admin granted
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        stripePaymentId: "admin_granted",
      },
      update: {
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    })

    return NextResponse.json(purchase)
  } catch (error) {
    console.error("Failed to grant access:", error)
    return NextResponse.json({ error: "Failed to grant access" }, { status: 500 })
  }
}
