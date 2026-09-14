import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"
import { cookies } from "next/headers"
import { FORUM_ACCESS_ERROR, hasForumAccess } from "@lib/forum-access"

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
    if (!(await hasForumAccess(payload.userId))) {
      return NextResponse.json({ error: FORUM_ACCESS_ERROR }, { status: 403 })
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
              where: {
                deleted: {
                  not: true,
                },
              },
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
