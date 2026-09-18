import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { getSubjectsByLicense, type LicenseType } from "@lib/subjects"
import { isResponse, requireStaff } from "@lib/staff"
import { contributedCourseIds } from "@lib/courses/contribution"

export async function GET(request: Request) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const { searchParams } = new URL(request.url)
  const license = (searchParams.get("license") || "cpl") as LicenseType
  const subjectIds = getSubjectsByLicense(license).map((s) => s.id)

  const courses = await prisma.course.findMany({
    where: { subjectId: { in: subjectIds } },
    include: {
      _count: {
        // Enrolment numbers are business data: admins only.
        select: { modules: true, ...(staff.isAdmin ? { enrollments: true } : {}) },
      },
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  })

  const mine = staff.isAdmin ? null : await contributedCourseIds(courses.map((c) => c.id), staff.userId)

  return NextResponse.json({
    courses: courses.map((c) => ({
      ...c,
      hasPendingRevision: !!c.pendingRevision,
      /** Curators only: they've written something in it, so they can submit it. */
      canSubmit: mine ? mine.has(c.id) : false,
    })),
    role: staff.role,
  })
}

export async function POST(request: Request) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const body = await request.json()
  const { subjectId, title, description, estimatedHours, difficulty } = body

  if (!subjectId || !title) {
    return NextResponse.json({ error: "Subject and title required" }, { status: 400 })
  }

  const course = await prisma.course.create({
    data: {
      subjectId,
      title,
      description: description || "",
      estimatedHours: estimatedHours || 1,
      difficulty: difficulty || "beginner",
      // New courses always start unpublished, whoever creates them.
      isPublished: false,
      authorId: staff.userId,
    },
  })

  return NextResponse.json({ course })
}
