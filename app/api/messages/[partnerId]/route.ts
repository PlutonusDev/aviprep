import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"
import { cookies } from "next/headers"

export async function GET(request: Request, { params }: { params: Promise<{ partnerId: string }> }) {
  try {
    const { partnerId } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Get partner info
    const partner = await prisma.user.findUnique({
      where: { id: partnerId },
      select: { id: true, firstName: true, lastName: true, profilePicture: true },
    })

    if (!partner) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get messages between users
    const messages = await prisma.privateMessage.findMany({
      where: {
        OR: [
          { senderId: payload.userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: payload.userId },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, profilePicture: true },
        },
      },
    })

    // Mark received messages as read
    await prisma.privateMessage.updateMany({
      where: {
        senderId: partnerId,
        receiverId: payload.userId,
        isRead: false,
      },
      data: { isRead: true },
    })

    return NextResponse.json({ partner, messages })
  } catch (error) {
    console.error("Error fetching conversation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
