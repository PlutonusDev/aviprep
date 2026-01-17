import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"
import { cookies } from "next/headers"

export async function GET(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  try {
    const { threadId } = await params
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
    const purchases = await prisma.purchase.count({
      where: {
        userId: payload.userId,
        expiresAt: { gt: new Date() },
      },
    })

    if (purchases === 0) {
      return NextResponse.json({ error: "Forum access requires at least one active subject purchase" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = 20

    // Increment view count
    await prisma.thread.update({
      where: { slug: threadId },
      data: { viewCount: { increment: 1 } },
    })

    const thread = await prisma.thread.findUnique({
      where: { slug: threadId },
      include: {
        forum: {
          include: { category: true },
        },
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
            isAdmin: true,
          },
        },
      },
    })

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 })
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { threadId: thread.id },
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePicture: true,
              isAdmin: true,
              createdAt: true,
            },
          },
          reactions: {
            include: {
              user: {
                select: { firstName: true, lastName: true },
              },
            },
          },
          replyTo: {
            select: {
              id: true,
              content: true,
              author: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
      prisma.post.count({ where: { threadId: thread.id } }),
    ])

    // Get post counts for each author
    const authorIds = Array.from(new Set(posts.map((p) => p.authorId)))
    const postCounts = await prisma.post.groupBy({
      by: ["authorId"],
      where: { authorId: { in: authorIds } },
      _count: { id: true },
    })
    const postCountMap = Object.fromEntries(postCounts.map((p) => [p.authorId, p._count.id]))

    const postsWithCounts = posts.map((post) => ({
      ...post,
      author: {
        ...post.author,
        postCount: postCountMap[post.authorId] || 0,
      },
    }))

    return NextResponse.json({
      thread,
      posts: postsWithCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching thread:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Admin actions: sticky, close, delete
export async function PATCH(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  try {
    const { threadId } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { isAdmin: true },
    })

    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { isSticky, isClosed } = await request.json()

    const thread = await prisma.thread.update({
      where: { id: threadId },
      data: {
        ...(isSticky !== undefined && { isSticky }),
        ...(isClosed !== undefined && { isClosed }),
      },
    })

    return NextResponse.json(thread)
  } catch (error) {
    console.error("Error updating thread:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  try {
    const { threadId } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { isAdmin: true },
    })

    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const thread = await prisma.thread.findUnique({ where: { slug: threadId }});

    await prisma.thread.update({
      where: { id: thread.id },
      data: {
        deleted: true
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting thread:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
