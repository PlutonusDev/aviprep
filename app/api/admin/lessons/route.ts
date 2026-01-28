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

  const body = await request.json()
  const { moduleId, title, description, contentType, content, estimatedMins } = body

  if (!moduleId || !title) {
    return NextResponse.json({ error: "Module ID and title required" }, { status: 400 })
  }

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
    },
  })

  return NextResponse.json({ lesson })
}
