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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { moduleId } = await params
  const body = await request.json()

  const module = await prisma.module.update({
    where: { id: moduleId },
    data: body,
  })

  return NextResponse.json({ module })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { moduleId } = await params

  await prisma.module.delete({
    where: { id: moduleId },
  })

  return NextResponse.json({ success: true })
}
