import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { courseIsLive, isResponse, liveContentError, pick, requireStaff } from "@lib/staff"


export async function POST(request: Request) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const body = await request.json()
  const { moduleId, title, description, contentType, content, estimatedMins } = body

  if (!moduleId || !title) {
    return NextResponse.json({ error: "Module ID and title required" }, { status: 400 })
  }

  if (!staff.isAdmin && (await courseIsLive({ moduleId }))) return liveContentError()

  // Get the next order number
  const lastLesson = await prisma.lesson.findFirst({
    where: { moduleId },
    orderBy: { order: "desc" },
  })

  const lesson = await prisma.lesson.create({
    data: {
      moduleId,
      title,
      description: description || "",
      contentType: contentType || "text",
      content: content || { html: "" },
      estimatedMins: estimatedMins || 5,
      order: (lastLesson?.order ?? -1) + 1,
      // Lessons earn royalty points for whoever wrote them.
      authorId: staff.userId,
    },
  })

  return NextResponse.json({ lesson })
}
