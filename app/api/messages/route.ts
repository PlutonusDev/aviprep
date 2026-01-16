import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Get unique conversations
    const messages = await prisma.privateMessage.findMany({
      where: {
        OR: [{ senderId: payload.userId }, { receiverId: payload.userId }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
          },
        },
      },
    })

    // Group by conversation partner
    const conversations = new Map<
      string,
      {
        partnerId: string
        partner: { id: string; firstName: string; lastName: string; profilePicture: string | null }
        lastMessage: (typeof messages)[0]
        unreadCount: number
      }
    >()

    for (const msg of messages) {
      const partnerId = msg.senderId === payload.userId ? msg.receiverId : msg.senderId
      const partner = msg.senderId === payload.userId ? msg.receiver : msg.sender

      if (!conversations.has(partnerId)) {
        const unreadCount = await prisma.privateMessage.count({
          where: {
            senderId: partnerId,
            receiverId: payload.userId,
            isRead: false,
          },
        })

        conversations.set(partnerId, {
          partnerId,
          partner,
          lastMessage: msg,
          unreadCount,
        })
      }
    }

    return NextResponse.json(Array.from(conversations.values()))
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { receiverId, content } = await request.json()

    if (!receiverId || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if receiver exists
    const receiver = await prisma.user.findUnique({ where: { id: receiverId } })
    if (!receiver) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const message = await prisma.privateMessage.create({
      data: {
        senderId: payload.userId,
        receiverId,
        content,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, profilePicture: true },
        },
        receiver: {
          select: { id: true, firstName: true, lastName: true, profilePicture: true },
        },
      },
    })

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error("Error sending message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
