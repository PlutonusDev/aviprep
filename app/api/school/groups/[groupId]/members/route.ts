import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { isResponse, requireSchool, studentsOf } from "@lib/school/access"

/**
 * Who's in a group.
 *
 *   POST { add?: string[], remove?: string[] }
 *
 * Additive rather than a whole-array replace, so two instructors working at
 * once don't undo each other: adding a student to an intake can't silently
 * drop someone the other one just added.
 */
export async function POST(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const access = await requireSchool()
  if (isResponse(access)) return access

  const { groupId } = await params
  if (!/^[a-f0-9]{24}$/i.test(groupId)) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const group = await prisma.studentGroup.findUnique({ where: { id: groupId }, select: { id: true, flightSchoolId: true, studentIds: true } })
  if (!group || group.flightSchoolId !== access.schoolId) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const add = await studentsOf(access.schoolId, body.add)
  const remove = new Set(Array.isArray(body.remove) ? body.remove.filter((id: unknown) => typeof id === "string") : [])

  const next = [...new Set([...group.studentIds.filter((id) => !remove.has(id)), ...add])]
  const updated = await prisma.studentGroup.update({ where: { id: groupId }, data: { studentIds: { set: next } }, select: { studentIds: true } })

  return NextResponse.json({
    studentIds: updated.studentIds,
    added: add.filter((id) => !group.studentIds.includes(id)).length,
    removed: group.studentIds.filter((id) => remove.has(id)).length,
  })
}
