import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"
import { cookies } from "next/headers"

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
      select: { isSuspendedFromForum: true },
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

    const { threadId, content, replyToId } = await request.json()

    if (!threadId || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if thread is closed
    const thread = await prisma.thread.findUnique({
      where: { slug: threadId },
      select: { isClosed: true, id: true },
    })

    if (thread?.isClosed) {
      return NextResponse.json({ error: "This thread is closed" }, { status: 403 })
    }

    const post = await prisma.$transaction(async (tx) => {
      const newPost = await tx.post.create({
        data: {
          content,
          threadId: thread.id,
          authorId: payload.userId,
          replyToId: replyToId || null,
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePicture: true,
              isAdmin: true,
            },
          },
          replyTo: {
            select: {
              id: true,
              author: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      })

      // Update thread's updatedAt
      await tx.thread.update({
        where: { id: thread.id },
        data: { updatedAt: new Date() },
      })

      return newPost
    })

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error("Error creating post:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
