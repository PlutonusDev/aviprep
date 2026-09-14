import { prisma } from "@lib/prisma"
import { getSchoolGrantedSubjectIds } from "@lib/school-access"

export const FORUM_ACCESS_ERROR = "Forum access requires at least one subject"

/**
 * The forums open to anyone with at least one subject, however they got it.
 * Previously only Purchase rows counted, which locked out every school student
 * whose subjects were granted by their school.
 */
export async function hasForumAccess(userId: string): Promise<boolean> {
  const [user, purchases] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } }),
    prisma.purchase.count({ where: { userId, expiresAt: { gt: new Date() } } }),
  ])
  if (!user) return false
  if (user.isAdmin || purchases > 0) return true

  const { individual, group } = await getSchoolGrantedSubjectIds(userId)
  return individual.length + group.length > 0
}
