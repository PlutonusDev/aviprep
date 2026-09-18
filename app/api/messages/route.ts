import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"
import { cookies } from "next/headers"
import { notifyNewMessage } from "@lib/notifications"

const MAX_MESSAGE_LENGTH = 2000

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
            isCurator: true,
            curatorCredential: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
            isCurator: true,
            curatorCredential: true,
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
        conversations.set(partnerId, { partnerId, partner, lastMessage: msg, unreadCount: 0 })
      }
      // Tallied from the rows already loaded; it used to be one count query per conversation.
      if (msg.receiverId === payload.userId && !msg.isRead) {
        conversations.get(partnerId)!.unreadCount++
      }
    }

    return NextResponse.json(
      Array.from(conversations.values()).map((c) => ({
        partnerId: c.partnerId,
        partner: c.partner,
        lastMessage: { content: c.lastMessage.content, createdAt: c.lastMessage.createdAt, senderId: c.lastMessage.senderId },
        unreadCount: c.unreadCount,
      })),
    )
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

    const body = await request.json()
    const receiverId = typeof body.receiverId === "string" ? body.receiverId : ""
    const content = typeof body.content === "string" ? body.content.trim() : ""

    if (!/^[a-f0-9]{24}$/i.test(receiverId) || !content) {
      return NextResponse.json({ error: "Write a message first" }, { status: 400 })
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Keep messages under ${MAX_MESSAGE_LENGTH} characters` }, { status: 400 })
    }
    if (receiverId === payload.userId) {
      return NextResponse.json({ error: "You can't message yourself" }, { status: 400 })
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
          select: { id: true, firstName: true, lastName: true, profilePicture: true, isCurator: true, curatorCredential: true },
        },
        receiver: {
          select: { id: true, firstName: true, lastName: true, profilePicture: true, isCurator: true, curatorCredential: true },
        },
      },
    })

    // Send notification to receiver
    const senderName = `${message.sender.firstName} ${message.sender.lastName}`
    await notifyNewMessage(receiverId, senderName, payload.userId, content).catch(err => 
      console.error("Failed to send message notification:", err)
    )

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error("Error sending message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
