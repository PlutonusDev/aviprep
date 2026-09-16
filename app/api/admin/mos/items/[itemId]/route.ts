import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { isResponse, requireStaff } from "@lib/staff"

/** Admin: exclude an item from coverage, or include it again. A reason is kept for the record. */
export async function PATCH(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const staff = await requireStaff()
  if (isResponse(staff)) return staff

  const { itemId } = await params
  const body = await request.json().catch(() => ({}))
  const excluded = body.excluded === true
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : ""
  if (excluded && !reason) return NextResponse.json({ error: "Add a reason." }, { status: 400 })

  try {
    const item = await prisma.mosItem.update({
      where: { id: itemId },
      data: excluded
        ? { excluded: true, excludedReason: reason, excludedById: staff.userId }
        : { excluded: false, excludedReason: null, excludedById: null },
      select: { id: true, excluded: true, excludedReason: true },
    })
    return NextResponse.json({ item })
  } catch {
    return NextResponse.json({ error: "Item not found" }, { status: 404 })
  }
}
