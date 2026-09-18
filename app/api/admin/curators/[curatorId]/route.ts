import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { isResponse, requireStaff } from "@lib/staff"
import { syncBadge } from "@lib/curators/community"

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
    // Their community badge says "Curator". Switching their access off has to
    // take it down, or a stranger keeps vouching for us in the forums.
    await syncBadge(curatorId)

    return NextResponse.json({ curator })
  } catch (error) {
    console.error("Curator update error:", error)
    return NextResponse.json({ error: "Couldn't update that curator." }, { status: 500 })
  }
}
