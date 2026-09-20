import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@lib/prisma"
import { schoolWhereFor } from "@lib/school/access"
import { verifyToken } from "@lib/auth"
import { sanitiseSubjectIds } from "@lib/school-access"

async function getSchoolForAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get("session")?.value
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { isFlightSchoolAdmin: true },
  })
  if (!user?.isFlightSchoolAdmin) return null

  return prisma.flightSchool.findFirst({
    where: schoolWhereFor(payload.userId),
    select: { id: true, name: true },
  })
}

export async function GET() {
  const school = await getSchoolForAdmin()
  if (!school) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const groups = await prisma.studentGroup.findMany({
    where: { flightSchoolId: school.id },
    orderBy: { name: "asc" },
  })

  // Resolve member names in one query rather than per group.
  const allIds = Array.from(new Set(groups.flatMap((g) => g.studentIds)))
  const students = allIds.length
    ? await prisma.user.findMany({
        where: { id: { in: allIds } },
        select: { id: true, firstName: true, lastName: true, email: true },
      })
    : []
  const byId = new Map(students.map((s) => [s.id, s]))

  return NextResponse.json({
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      color: g.color,
      studentIds: g.studentIds,
      subjectIds: g.subjectIds ?? [],
      members: g.studentIds.map((id) => byId.get(id)).filter(Boolean),
      createdAt: g.createdAt,
    })),
  })
}

export async function POST(request: Request) {
  const school = await getSchoolForAdmin()
  if (!school) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const name = String(body.name ?? "").trim()

  if (!name) {
    return NextResponse.json({ error: "A group name is required." }, { status: 422 })
  }

  const group = await prisma.studentGroup.create({
    data: {
      flightSchoolId: school.id,
      name,
      description: String(body.description ?? "").trim() || null,
      color: typeof body.color === "string" ? body.color : "#3b82f6",
      studentIds: Array.isArray(body.studentIds) ? body.studentIds : [],
      subjectIds: sanitiseSubjectIds(body.subjectIds),
    },
  })

  return NextResponse.json({ group })
}
