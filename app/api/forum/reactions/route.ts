import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"
import { cookies } from "next/headers"

const VALID_REACTIONS = ["heart", "thumbsup", "fire", "sparkles"]

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

    const { postId, type } = await request.json()

    if (!postId || !type || !VALID_REACTIONS.includes(type)) {
      return NextResponse.json({ error: "Invalid reaction" }, { status: 400 })
    }

    // Check if reaction exists - if so, remove it (toggle behavior)
    const existing = await prisma.reaction.findUnique({
      where: {
        postId_userId_type: {
          postId,
          userId: payload.userId,
          type,
        },
      },
    })

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } })
      return NextResponse.json({ removed: true })
    }

    const reaction = await prisma.reaction.create({
      data: {
        postId,
        userId: payload.userId,
        type,
      },
    })

    return NextResponse.json(reaction, { status: 201 })
  } catch (error) {
    console.error("Error handling reaction:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
