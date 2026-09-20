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
    select: { id: true },
  })
}

/** Confirms the group belongs to this admin's school before touching it. */
async function ownedGroup(groupId: string, schoolId: string) {
  const group = await prisma.studentGroup.findUnique({ where: { id: groupId } })
  return group && group.flightSchoolId === schoolId ? group : null
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const school = await getSchoolForAdmin()
  if (!school) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { groupId } = await params
  if (!(await ownedGroup(groupId, school.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json()
  const data: Record<string, unknown> = {}

  if (typeof body.name === "string") {
    const name = body.name.trim()
    if (!name) return NextResponse.json({ error: "A group name is required." }, { status: 422 })
    data.name = name
  }
  if (typeof body.description === "string") data.description = body.description.trim() || null
  if (typeof body.color === "string") data.color = body.color
  if (Array.isArray(body.studentIds)) data.studentIds = body.studentIds
  if (body.subjectIds !== undefined) data.subjectIds = sanitiseSubjectIds(body.subjectIds)

  const group = await prisma.studentGroup.update({ where: { id: groupId }, data })
  return NextResponse.json({ group })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const school = await getSchoolForAdmin()
  if (!school) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { groupId } = await params
  if (!(await ownedGroup(groupId, school.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.studentGroup.delete({ where: { id: groupId } })
  return NextResponse.json({ ok: true })
}
