import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { isResponse, requireStaff } from "@lib/staff"

/** { isActive } switches a curator off or back on. Switching off ends their sessions straight away. */
export async function PATCH(request: Request, { params }: { params: Promise<{ curatorId: string }> }) {
  const staff = await requireStaff()
  if (isResponse(staff)) return staff

  try {
    const { curatorId } = await params
    const body = await request.json().catch(() => ({}))
    if (typeof body.isActive !== "boolean") return NextResponse.json({ error: "Nothing to change." }, { status: 400 })

    const curator = await prisma.curator.update({
      where: { id: curatorId },
      data: { isActive: body.isActive },
      select: { id: true, isActive: true },
    })
    return NextResponse.json({ curator })
  } catch (error) {
    console.error("Curator update error:", error)
    return NextResponse.json({ error: "Couldn't update that curator." }, { status: 500 })
  }
}
