import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { getSession, getUserWithPurchases, getUserStats } from "@lib/auth"
import { getCurator } from "@lib/curators/session"
import { getSchoolGrantedSubjectIds } from "@lib/school-access"
import { isCuratorHost } from "@lib/tenant"

/**
 * In the curator studio the "user" is the Curator account, shaped like a member
 * so the shared admin frame (header, sidebar, guards) works unchanged.
 */
async function curatorMe() {
  const curator = await getCurator()
  if (!curator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json({
    user: {
      id: curator.id,
      email: curator.email,
      firstName: curator.firstName,
      lastName: curator.lastName,
      phone: curator.phone,
      arn: "",
      profilePicture: null,
      isFlightSchoolAdmin: false,
      isAdmin: false,
      isCurator: true,
      hasBundle: false,
      bundleExpiry: null,
      createdAt: curator.createdAt,
      onboardedAt: curator.createdAt,
      emailVerifiedAt: curator.createdAt,
      canClaimFreeSubject: false,
    },
    purchases: [],
    schoolGrants: null,
    examAttempts: [],
    weakPoints: [],
    stats: null,
  })
}

export async function GET() {
  try {
    if (isCuratorHost((await headers()).get("host") ?? "")) return curatorMe()

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
        isCurator: false,
        hasBundle: user.hasBundle,
        bundleExpiry: user.bundleExpiry,
        createdAt: user.createdAt,
        onboardedAt: user.onboardedAt,
        emailVerifiedAt: user.emailVerifiedAt,
        canClaimFreeSubject: user.freeSubjectEligible === true && !user.freeSubjectId,
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
