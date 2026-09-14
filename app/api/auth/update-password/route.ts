import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@lib/prisma"
import { verifyPassword, createSession, verifyToken, hashPassword } from "@lib/auth"

export async function PATCH(request: Request) {
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

    const body = await request.json()
    const { oldPassword, newPassword } = body

    // Validate required fields
    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: "oldPassword and newPassword are required" }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Use at least 8 characters", field: "newPassword" }, { status: 400 })
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: payload.email },
    })

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify old password
    const isValid = await verifyPassword(oldPassword, user.passwordHash)

    // 400, not 401: a wrong current password isn't an expired session.
    if (!isValid) {
      return NextResponse.json({ error: "Your current password is incorrect", field: "oldPassword" }, { status: 400 })
    }

    if (await verifyPassword(newPassword, user.passwordHash)) {
      return NextResponse.json({ error: "Choose a password you haven't used here", field: "newPassword" }, { status: 400 })
    }

    const passwordHash = await hashPassword(newPassword)

    // Update password
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    })
  } catch (error) {
    console.error("Update password error:", error)
    return NextResponse.json({ error: "Couldn't update your password" }, { status: 500 })
  }
}
