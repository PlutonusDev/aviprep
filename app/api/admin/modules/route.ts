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
  const { courseId, title, description } = body

  if (!courseId || !title) {
    return NextResponse.json({ error: "Course ID and title required" }, { status: 400 })
  }

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
