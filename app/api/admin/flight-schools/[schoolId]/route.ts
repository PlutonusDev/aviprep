import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"

async function verifyAdmin(token: string) {
  const payload = await verifyToken(token)
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, isAdmin: true },
  })

  return user?.isAdmin ? user : null
}

export async function PATCH(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const { schoolId } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = await verifyAdmin(token)
    if (!admin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    // Allow updating certain fields
    const allowedFields = ["name", "isActive", "maxStudents", "subscriptionTier", "subscriptionExpiry"]
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    const updated = await prisma.flightSchool.update({
      where: { id: schoolId },
      data: updates,
    })

    return NextResponse.json({ success: true, school: updated })
  } catch (error) {
    console.error("Update flight school error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const { schoolId } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = await verifyAdmin(token)
    if (!admin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    // Get the school first to get the admin ID
    const school = await prisma.flightSchool.findUnique({
      where: { id: schoolId },
      select: { adminId: true },
    })

    if (!school) {
      return NextResponse.json({ error: "Flight school not found" }, { status: 404 })
    }

    // Remove all students from the school
    await prisma.user.updateMany({
      where: { flightSchoolId: schoolId },
      data: { flightSchoolId: null, enrolledAt: null },
    })

    // Remove admin status from the admin user
    await prisma.user.update({
      where: { id: school.adminId },
      data: { isFlightSchoolAdmin: false },
    })

    // Delete student groups
    await prisma.studentGroup.deleteMany({
      where: { flightSchoolId: schoolId },
    })

    // Delete school purchases
    await prisma.schoolPurchase.deleteMany({
      where: { flightSchoolId: schoolId },
    })

    // Delete the school
    await prisma.flightSchool.delete({
      where: { id: schoolId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete flight school error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
