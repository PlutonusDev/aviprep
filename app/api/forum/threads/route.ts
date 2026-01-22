import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"
import { cookies } from "next/headers"

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50)
}

export async function POST(request: Request) {
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

    // Check if user is suspended
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        isSuspendedFromForum: true,
        isAdmin: true,
      },
    })

    if (user?.isSuspendedFromForum) {
      return NextResponse.json({ error: "Your forum posting privileges have been suspended" }, { status: 403 })
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

    const { forumId, title, content } = await request.json()

    if (!forumId || !title || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const forum = await prisma.forum.findUnique({
      where: {
        slug: forumId
      }
    });

    if(forum.protected || !user.isAdmin) return NextResponse.json({ error: "Forum is protected" }, { status: 403 });

    // Generate unique slug
    let slug = generateSlug(title)
    const existing = await prisma.thread.findFirst({
      where: { forumId: forum.id, slug },
    })
    if (existing) {
      slug = `${slug}-${Date.now()}`
    }

    // Create thread and first post in transaction
    const thread = await prisma.$transaction(async (tx) => {
      const newThread = await tx.thread.create({
        data: {
          title,
          slug,
          forumId: forum.id,
          authorId: payload.userId,
        },
      })

      await tx.post.create({
        data: {
          content,
          threadId: newThread.id,
          authorId: payload.userId,
          isFirstPost: true,
        },
      })

      return newThread
    })

    return NextResponse.json(thread, { status: 201 })
  } catch (error) {
    console.error("Error creating thread:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
