import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"
import { cookies } from "next/headers"

// Check if user has forum access (at least 1 active purchase)
async function checkForumAccess(userId: string) {
  const purchases = await prisma.purchase.count({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
  })
  return purchases > 0
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Check forum access
    const hasAccess = await checkForumAccess(payload.userId)
    if (!hasAccess) {
      return NextResponse.json({ error: "Forum access requires at least one active subject purchase" }, { status: 403 })
    }

    const categories = await prisma.forumCategory.findMany({
      orderBy: { order: "asc" },
      include: {
        forums: {
          orderBy: { order: "asc" },
          include: {
            _count: {
              select: { threads: true },
            },
            threads: {
              take: 1,
              orderBy: { updatedAt: "desc" },
              include: {
                author: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error("Error fetching categories:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
