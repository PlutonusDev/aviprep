import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"

async function verifyAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get("session")?.value
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, isAdmin: true },
  })

  return user?.isAdmin ? user : null
}

export async function POST(request: Request) {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { moduleId, newOrder } = await request.json()

  if (!moduleId || newOrder === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const module = await prisma.module.findUnique({
    where: { id: moduleId },
    select: { id: true, courseId: true, order: true },
  })

  if (!module) {
    return NextResponse.json({ error: "Module not found" }, { status: 404 })
  }

  const oldOrder = module.order

  if (newOrder > oldOrder) {
    // Moving down
    await prisma.module.updateMany({
      where: {
        courseId: module.courseId,
        order: { gt: oldOrder, lte: newOrder },
      },
      data: {
        order: { decrement: 1 },
      },
    })
  } else if (newOrder < oldOrder) {
    // Moving up
    await prisma.module.updateMany({
      where: {
        courseId: module.courseId,
        order: { gte: newOrder, lt: oldOrder },
      },
      data: {
        order: { increment: 1 },
      },
    })
  }

  await prisma.module.update({
    where: { id: moduleId },
    data: { order: newOrder },
  })

  return NextResponse.json({ success: true })
}
