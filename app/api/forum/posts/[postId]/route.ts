import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"
import { cookies } from "next/headers"

export async function PATCH(request: Request, { params }: { params: { postId: string } }) {
  try {
    const { postId } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Only the author can edit their post
    if (post.authorId !== payload.userId) {
      return NextResponse.json({ error: "You can only edit your own posts" }, { status: 403 })
    }

    const { content } = await request.json()

    if (!content || content.trim() === "" || content === "<p></p>") {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        content,
        editedAt: new Date(),
      },
    })

    return NextResponse.json(updatedPost)
  } catch (error) {
    console.error("Error editing post:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { postId: string } }) {
  try {
    const { postId } = await params
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

    // Check if it's a first post - if so, delete the thread
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { isFirstPost: true, threadId: true },
    })

    if (post?.isFirstPost) {
      await prisma.thread.delete({ where: { id: post.threadId } })
    } else {
      await prisma.post.update({
        where: { id: postId },
        data: {
          content: "<i>This post has been deleted.</i>",
          deleted: true,
          editedAt: new Date()
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting post:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}