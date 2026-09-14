import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"
import { sanitiseSubjectIds, getSchoolGrantedSubjectIds } from "@lib/school-access"

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

  return prisma.flightSchool.findUnique({
    where: { adminId: payload.userId },
    select: { id: true },
  })
}

/** A school admin may only touch students enrolled at their own school. */
async function ownedStudent(studentId: string, schoolId: string) {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, flightSchoolId: true, schoolSubjectIds: true },
  })
  return student && student.flightSchoolId === schoolId ? student : null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const school = await getSchoolForAdmin()
  if (!school) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { studentId } = await params
  const student = await ownedStudent(studentId, school.id)
  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Group-granted subjects are shown separately so the admin can see what is
  // already covered before granting the same thing again individually.
  const grants = await getSchoolGrantedSubjectIds(studentId)

  return NextResponse.json({
    individual: grants.individual,
    group: grants.group,
  })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const school = await getSchoolForAdmin()
  if (!school) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { studentId } = await params
  if (!(await ownedStudent(studentId, school.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json()
  const subjectIds = sanitiseSubjectIds(body.subjectIds)

  await prisma.user.update({
    where: { id: studentId },
    data: { schoolSubjectIds: subjectIds },
  })

  return NextResponse.json({ subjectIds })
}
