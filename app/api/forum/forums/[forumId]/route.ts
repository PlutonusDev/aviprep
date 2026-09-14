import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"
import { cookies } from "next/headers"
import { FORUM_ACCESS_ERROR, hasForumAccess } from "@lib/forum-access"

export async function GET(request: Request, { params }: { params: Promise<{ forumId: string }> }) {
  try {
    const { forumId } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    if (!(await hasForumAccess(payload.userId))) {
      return NextResponse.json({ error: FORUM_ACCESS_ERROR }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = 20

    const forum = await prisma.forum.findUnique({
      where: { slug: forumId },
      include: {
        category: true,
      },
    })

    if (!forum) {
      return NextResponse.json({ error: "Forum not found" }, { status: 404 })
    }

    const [threads, total] = await Promise.all([
      prisma.thread.findMany({
        where: {
          forumId: forum.id,
          NOT: {
            deleted: true
          }
        },
        orderBy: [{ isSticky: "desc" }, { updatedAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePicture: true,
            },
          },
          _count: {
            select: { posts: true },
          },
          posts: {
            take: 1,
            orderBy: { createdAt: "desc" },
            include: {
              author: {
                select: { firstName: true, lastName: true },
              },
            },
          },
        },
      }),
      prisma.thread.count({ where: { forumId: forum.id, NOT: { deleted: true } } }),
    ])

    return NextResponse.json({
      forum,
      threads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching forum:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
