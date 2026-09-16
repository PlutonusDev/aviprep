import "server-only"

import { NextResponse } from "next/server"
import { cookies, headers } from "next/headers"
import { verifyToken } from "@lib/auth"
import { getCurator } from "@lib/curators/session"
import { prisma } from "@lib/prisma"
import { isCuratorHost } from "@lib/tenant"

/**
 * Staff roles for the admin panel.
 *
 * - admin:   everything, on the main site with a member session.
 * - curator: a separate Curator account, signed in on curators.aviprep.com.au.
 *            Writes courses, lessons and questions and submits them for review,
 *            but never publishes and never reaches members, schools, billing,
 *            email or any other business data.
 *
 * Which one applies is decided by the host: the curators subdomain accepts only
 * curator sessions, and the main site accepts only admins.
 *
 * Every admin API checks through here, so the rule is enforced on the server
 * regardless of what the UI shows.
 */

export type StaffRole = "admin" | "curator"

export interface Staff {
  userId: string
  role: StaffRole
  isAdmin: boolean
}

export async function getStaff(): Promise<Staff | null> {
  const headerList = await headers()
  if (isCuratorHost(headerList.get("host") ?? "")) {
    const curator = await getCurator()
    return curator ? { userId: curator.id, role: "curator", isAdmin: false } : null
  }

  const cookieStore = await cookies()
  const token = cookieStore.get("session")?.value
  if (!token) return null
  const payload = await verifyToken(token)
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, isAdmin: true },
  })
  return user?.isAdmin ? { userId: user.id, role: "admin", isAdmin: true } : null
}

/**
 * Use at the top of a route: returns the staff member, or a response to send
 * back. `curators` opts a content route in; everything else stays admin-only.
 */
export async function requireStaff({ curators = false }: { curators?: boolean } = {}): Promise<Staff | NextResponse> {
  const staff = await getStaff()
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!staff.isAdmin && !curators) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  return staff
}

export const isResponse = (v: unknown): v is NextResponse => v instanceof NextResponse

export const liveContentError = () =>
  NextResponse.json(
    { error: "This course is live, so structural changes need an admin. You can still propose edits to its lessons." },
    { status: 403 },
  )

/** Whether the course a module or lesson belongs to is live. */
export async function courseIsLive(ref: { courseId?: string; moduleId?: string; lessonId?: string }) {
  if (ref.courseId) {
    const course = await prisma.course.findUnique({ where: { id: ref.courseId }, select: { isPublished: true } })
    return !!course?.isPublished
  }
  if (ref.moduleId) {
    const mod = await prisma.module.findUnique({ where: { id: ref.moduleId }, select: { course: { select: { isPublished: true } } } })
    return !!mod?.course.isPublished
  }
  if (ref.lessonId) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: ref.lessonId },
      select: { module: { select: { course: { select: { isPublished: true } } } } },
    })
    return !!lesson?.module.course.isPublished
  }
  return false
}

/** Copies only the named fields that are present in the body. */
export function pick<T extends string>(body: Record<string, unknown>, fields: readonly T[]) {
  const out: Partial<Record<T, unknown>> = {}
  for (const f of fields) if (body[f] !== undefined) out[f] = body[f]
  return out
}
