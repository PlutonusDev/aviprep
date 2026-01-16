import { NextResponse } from "next/server"
import { getSession, getUserWithPurchases, getUserStats } from "@lib/auth"

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserWithPurchases(session.id)
    const stats = await getUserStats(session.id)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        arn: user.arn,
        profilePicture: user.profilePicture,
        isAdmin: user.isAdmin,
        hasBundle: user.hasBundle,
        bundleExpiry: user.bundleExpiry,
        createdAt: user.createdAt,
      },
      purchases: user.purchases,
      examAttempts: user.examAttempts,
      weakPoints: user.weakPoints,
      stats,
    })
  } catch (error) {
    console.error("Get user error:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}
