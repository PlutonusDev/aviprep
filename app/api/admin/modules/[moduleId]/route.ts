import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { courseIsLive, isResponse, liveContentError, pick, requireStaff } from "@lib/staff"


export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const { moduleId } = await params
  const body = await request.json()

  if (!staff.isAdmin && (await courseIsLive({ moduleId }))) return liveContentError()

  // Only editable fields; the body used to be written to the database as-is.
  const module = await prisma.module.update({
    where: { id: moduleId },
    data: pick(body, ["title", "description", "order"] as const),
  })

  return NextResponse.json({ module })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const { moduleId } = await params

  if (!staff.isAdmin && (await courseIsLive({ moduleId }))) return liveContentError()

  await prisma.module.delete({
    where: { id: moduleId },
  })

  return NextResponse.json({ success: true })
}
