import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { courseIsLive, isResponse, liveContentError, pick, requireStaff } from "@lib/staff"


export async function POST(request: Request) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const body = await request.json()
  const { courseId, title, description } = body

  if (!courseId || !title) {
    return NextResponse.json({ error: "Course ID and title required" }, { status: 400 })
  }

  if (!staff.isAdmin && (await courseIsLive({ courseId }))) return liveContentError()

  // Get the next order number
  const lastModule = await prisma.module.findFirst({
    where: { courseId },
    orderBy: { order: "desc" },
  })

  const module = await prisma.module.create({
    data: {
      courseId,
      title,
      description: description || "",
      order: (lastModule?.order ?? -1) + 1,
    },
  })

  return NextResponse.json({ module })
}
