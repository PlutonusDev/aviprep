import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@lib/auth"
import { prisma } from "@lib/prisma"

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { profilePicture } = await request.json()

    // Only our own uploads (or null to remove). Anything else let a user point
    // their avatar - shown to everyone in the forums - at any URL they liked.
    const valid =
      profilePicture === null ||
      (typeof profilePicture === "string" &&
        profilePicture.length < 500 &&
        (/^\/(?!\/)/.test(profilePicture) || /^https:\/\//.test(profilePicture)))
    if (!valid) {
      return NextResponse.json({ error: "Invalid image" }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id: session.id },
      data: { profilePicture },
      select: {
        id: true,
        profilePicture: true,
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Update profile error:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
