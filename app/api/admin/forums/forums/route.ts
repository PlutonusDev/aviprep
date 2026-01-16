import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"
import { cookies } from "next/headers"

async function verifyAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get("session")?.value
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { isAdmin: true },
  })

  return user?.isAdmin ? payload.userId : null
}

export async function POST(request: Request) {
  try {
    const adminId = await verifyAdmin()
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { categoryId, name, description } = await request.json()

    if (!categoryId || !name) {
      return NextResponse.json({ error: "Category and name are required" }, { status: 400 })
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")

    // Get max order in category
    const maxOrder = await prisma.forum.aggregate({
      where: { categoryId },
      _max: { order: true },
    })

    const forum = await prisma.forum.create({
      data: {
        name,
        description: description || null,
        slug: `${slug}-${Date.now()}`,
        categoryId,
        order: (maxOrder._max.order || 0) + 1,
      },
    })

    return NextResponse.json(forum, { status: 201 })
  } catch (error) {
    console.error("Error creating forum:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
