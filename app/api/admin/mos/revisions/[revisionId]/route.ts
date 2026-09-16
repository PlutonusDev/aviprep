import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { isResponse, requireStaff } from "@lib/staff"

export const dynamic = "force-dynamic"

/** The change report stored with an applied update. Admins only. */
export async function GET(_request: Request, { params }: { params: Promise<{ revisionId: string }> }) {
  const staff = await requireStaff()
  if (isResponse(staff)) return staff

  const { revisionId } = await params
  if (!/^[a-f0-9]{24}$/i.test(revisionId)) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const revision = await prisma.mosRevision.findUnique({ where: { id: revisionId } })
  if (!revision?.changes) return NextResponse.json({ error: "No report stored for this update." }, { status: 404 })

  const user = await prisma.user.findUnique({ where: { id: revision.appliedById }, select: { firstName: true, lastName: true } })
  return NextResponse.json({
    report: revision.changes,
    status: {
      kind: "applied",
      appliedAt: revision.appliedAt.toISOString(),
      appliedBy: user ? `${user.firstName} ${user.lastName}`.trim() : null,
    },
  })
}
