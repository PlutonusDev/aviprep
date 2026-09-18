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

    if (!/^[a-f0-9]{24}$/i.test(partnerId)) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // ?after=<ISO date> returns only newer messages, so polling doesn't resend
    // the whole conversation every few seconds.
    const afterParam = new URL(request.url).searchParams.get("after")
    const after = afterParam ? new Date(afterParam) : null
    const since = after && !Number.isNaN(after.getTime()) ? after : null

    // Get partner info
    const partner = await prisma.user.findUnique({
      where: { id: partnerId },
      select: { id: true, firstName: true, lastName: true, profilePicture: true, isCurator: true, curatorCredential: true },
    })

    if (!partner) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get messages between users: the newest 300, returned oldest first.
    const latest = await prisma.privateMessage.findMany({
      where: {
        OR: [
          { senderId: payload.userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: payload.userId },
        ],
        ...(since && { createdAt: { gt: since } }),
      },
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, profilePicture: true, isCurator: true, curatorCredential: true },
        },
      },
    })

    const messages = latest.reverse()

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
