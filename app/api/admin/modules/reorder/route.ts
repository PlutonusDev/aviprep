import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { courseIsLive, isResponse, liveContentError, pick, requireStaff } from "@lib/staff"


export async function POST(request: Request) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const { moduleId, newOrder } = await request.json()

  if (!moduleId || newOrder === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  if (!staff.isAdmin && (await courseIsLive({ moduleId }))) return liveContentError()

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
