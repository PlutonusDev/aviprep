import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { isResponse, ownsStudent, requireSchool } from "@lib/school/access"

/**
 * The groups one student belongs to.
 *
 *   GET            every group in the school, with whether this student is in it
 *   PUT { groupIds }  set exactly which ones they're in
 *
 * The other direction of the same relationship as
 * /api/school/groups/[groupId]/members - reached from the Students table,
 * where instructors think "put this person in that intake" rather than
 * "edit that intake's roster".
 */

async function guard(studentId: string) {
  const access = await requireSchool()
  if (isResponse(access)) return { error: access }
  if (!(await ownsStudent(access.schoolId, studentId))) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) }
  }
  return { access }
}

export async function GET(_request: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params
  const { access, error } = await guard(studentId)
  if (error) return error

  const groups = await prisma.studentGroup.findMany({
    where: { flightSchoolId: access!.schoolId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true, description: true, studentIds: true, subjectIds: true },
  })

  return NextResponse.json({
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      color: g.color,
      description: g.description,
      memberCount: g.studentIds.length,
      subjectCount: (g.subjectIds ?? []).length,
      member: g.studentIds.includes(studentId),
    })),
  })
}

export async function PUT(request: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params
  const { access, error } = await guard(studentId)
  if (error) return error

  const body = await request.json().catch(() => ({}))
  const wanted = new Set(Array.isArray(body.groupIds) ? body.groupIds.filter((id: unknown) => typeof id === "string") : [])

  const groups = await prisma.studentGroup.findMany({
    where: { flightSchoolId: access!.schoolId },
    select: { id: true, studentIds: true },
  })

  // Only the groups whose answer actually changed are written.
  await Promise.all(
    groups
      .filter((g) => g.studentIds.includes(studentId) !== wanted.has(g.id))
      .map((g) =>
        prisma.studentGroup.update({
          where: { id: g.id },
          data: {
            studentIds: wanted.has(g.id) ? { push: studentId } : { set: g.studentIds.filter((id) => id !== studentId) },
          },
        }),
      ),
  )

  return NextResponse.json({ groupIds: groups.filter((g) => wanted.has(g.id)).map((g) => g.id) })
}
