import { NextResponse } from "next/server"
import { getSession, getUserWithPurchases, getUserStats } from "@lib/auth"
import { getSchoolGrantedSubjectIds } from "@lib/school-access"

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [user, stats, schoolGrants] = await Promise.all([
      getUserWithPurchases(session.id),
      getUserStats(session.id),
      getSchoolGrantedSubjectIds(session.id),
    ])

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
        isFlightSchoolAdmin: user.isFlightSchoolAdmin,
        isAdmin: user.isAdmin,
        hasBundle: user.hasBundle,
        bundleExpiry: user.bundleExpiry,
        createdAt: user.createdAt,
        onboardedAt: user.onboardedAt,
      },
      purchases: user.purchases,
      // Subjects the student's school opened up, individually or via a group.
      schoolGrants,
      examAttempts: user.examAttempts,
      weakPoints: user.weakPoints,
      stats,
    })
  } catch (error) {
    console.error("Get user error:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}
