import "server-only"

import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"

/**
 * Who may use a school's panel.
 *
 * A school has one owner (FlightSchool.adminId, set when AviPrep creates it)
 * and any number of instructors the school invited itself
 * (FlightSchool.instructorIds, see lib/school/invites.ts). Both get the same
 * access; the difference is only that the owner can't be removed and is the
 * one who can remove other people.
 *
 * Every /api/school route resolves access through here rather than looking up
 * `adminId` itself, so an invited instructor can't be let into one page and
 * locked out of the next.
 */

/**
 * The lookup every school route shares: owner or invited instructor, never
 * `adminId` alone. Exported as a where-clause so routes can keep their own
 * `select`.
 */
export const schoolWhereFor = (userId: string) => ({ OR: [{ adminId: userId }, { instructorIds: { has: userId } }] })

export interface SchoolAccess {
  userId: string
  schoolId: string
  /** They set the school up. Only they can remove an instructor. */
  isOwner: boolean
}

/** The school this request may act on, or null. */
export async function getSchoolAccess(): Promise<SchoolAccess | null> {
  const token = (await cookies()).get("session")?.value
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { isFlightSchoolAdmin: true } })
  if (!user?.isFlightSchoolAdmin) return null

  const school = await prisma.flightSchool.findFirst({
    where: schoolWhereFor(payload.userId),
    select: { id: true, adminId: true },
  })
  if (!school) return null

  return { userId: payload.userId, schoolId: school.id, isOwner: school.adminId === payload.userId }
}

/** The same, as a guard: returns a 401/403 response when there's no access. */
export async function requireSchool(): Promise<SchoolAccess | NextResponse> {
  const access = await getSchoolAccess()
  if (!access) return NextResponse.json({ error: "Not authorized" }, { status: 403 })
  return access
}

export const isResponse = (value: unknown): value is NextResponse => value instanceof NextResponse

/** Confirms a student is one of this school's, before anything is read or changed. */
export async function ownsStudent(schoolId: string, studentId: string) {
  if (!/^[a-f0-9]{24}$/i.test(studentId)) return false
  const student = await prisma.user.findFirst({ where: { id: studentId, flightSchoolId: schoolId }, select: { id: true } })
  return !!student
}

/**
 * The subset of these ids that really are this school's students. Group
 * membership is a bare array of ObjectIds, so it has to be filtered on the way
 * in or a school could write anyone's id into its own group.
 */
export async function studentsOf(schoolId: string, ids: unknown): Promise<string[]> {
  if (!Array.isArray(ids)) return []
  const candidates = [...new Set(ids.filter((id): id is string => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id)))]
  if (!candidates.length) return []
  const rows = await prisma.user.findMany({ where: { id: { in: candidates }, flightSchoolId: schoolId }, select: { id: true } })
  return rows.map((r) => r.id)
}

/** Everyone with access to the panel, owner first. */
export async function instructorsOf(schoolId: string) {
  const school = await prisma.flightSchool.findUnique({ where: { id: schoolId }, select: { adminId: true, instructorIds: true } })
  if (!school) return []

  const ids = [school.adminId, ...school.instructorIds.filter((id) => id !== school.adminId)]
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, firstName: true, lastName: true, email: true, profilePicture: true, createdAt: true },
  })
  const byId = new Map(users.map((u) => [u.id, u]))

  return ids
    .map((id) => byId.get(id))
    .filter((u): u is NonNullable<typeof u> => !!u)
    .map((u) => ({ ...u, isOwner: u.id === school.adminId }))
}
