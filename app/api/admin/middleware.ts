import { cookies } from "next/headers"
import { verifyToken } from "@lib/auth"
import { prisma } from "@lib/prisma"
import { getStaff } from "@lib/staff"

export async function verifyAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get("session")?.value

  if (!token) {
    return { error: "Unauthorized", status: 401 }
  }

  const payload = await verifyToken(token)
  if (!payload) {
    return { error: "Unauthorized", status: 401 }
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, isAdmin: true },
  })

  if (!user?.isAdmin) {
    return { error: "Forbidden", status: 403 }
  }

  return { userId: user.id }
}

/**
 * For content routes (courses, lessons, questions): admins and curators.
 * Same return shape as verifyAdmin, plus the role.
 */
export async function verifyContentStaff(): Promise<
  { error: string; status: number } | { userId: string; role: "admin" | "curator"; isAdmin: boolean }
> {
  const staff = await getStaff()
  if (!staff) return { error: "Unauthorized", status: 401 }
  return staff
}
