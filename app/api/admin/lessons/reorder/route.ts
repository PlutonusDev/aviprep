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

  const { lessonId, newModuleId, newOrder } = await request.json()

  if (!lessonId || newOrder === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Get the lesson being moved
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, moduleId: true, order: true },
  })

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
  }

  const targetModuleId = newModuleId || lesson.moduleId
  const isMovingModules = targetModuleId !== lesson.moduleId

  // If moving to a different module
  if (isMovingModules) {
    // Decrement order of lessons in old module that were after this lesson
    await prisma.lesson.updateMany({
      where: {
        moduleId: lesson.moduleId,
        order: { gt: lesson.order },
      },
      data: {
        order: { decrement: 1 },
      },
    })

    // Increment order of lessons in new module at or after new position
    await prisma.lesson.updateMany({
      where: {
        moduleId: targetModuleId,
        order: { gte: newOrder },
      },
      data: {
        order: { increment: 1 },
      },
    })

    // Move the lesson
    await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        moduleId: targetModuleId,
        order: newOrder,
      },
    })
  } else {
    // Reordering within the same module
    const oldOrder = lesson.order

    if (newOrder > oldOrder) {
      // Moving down: decrement lessons between old and new position
      await prisma.lesson.updateMany({
        where: {
          moduleId: lesson.moduleId,
          order: { gt: oldOrder, lte: newOrder },
        },
        data: {
          order: { decrement: 1 },
        },
      })
    } else if (newOrder < oldOrder) {
      // Moving up: increment lessons between new and old position
      await prisma.lesson.updateMany({
        where: {
          moduleId: lesson.moduleId,
          order: { gte: newOrder, lt: oldOrder },
        },
        data: {
          order: { increment: 1 },
        },
      })
    }

    // Update the lesson's order
    await prisma.lesson.update({
      where: { id: lessonId },
      data: { order: newOrder },
    })
  }

  return NextResponse.json({ success: true })
}
