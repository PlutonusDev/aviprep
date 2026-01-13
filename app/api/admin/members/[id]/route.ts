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
    const member = await prisma.user.update({
      where: { id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        arn: body.arn,
        isAdmin: body.isAdmin,
        hasBundle: body.hasBundle,
        ...(body.hasBundle &&
          !body.bundleExpiry && {
            bundleExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          }),
      },
    })

    return NextResponse.json(member)
  } catch (error) {
    console.error("Failed to update member:", error)
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 })
  }
}
