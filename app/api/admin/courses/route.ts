import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"
import { getSubjectsByLicense } from "@lib/subjects"

async function verifyAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get("session")?.value
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, isAdmin: true },
  })

  return user?.isAdmin ? user : null
}

export async function GET(request: Request) {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const license = searchParams.get("license") || "cpl"
  
  const subjects = getSubjectsByLicense(license as any)
  const subjectIds = subjects.map(s => s.id)

  const courses = await prisma.course.findMany({
    where: {
      subjectId: { in: subjectIds },
    },
    include: {
      _count: {
        select: {
          modules: true,
          enrollments: true,
        },
      },
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  })

  return NextResponse.json({ courses })
}

export async function POST(request: Request) {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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
    },
  })

  return NextResponse.json({ course })
}
