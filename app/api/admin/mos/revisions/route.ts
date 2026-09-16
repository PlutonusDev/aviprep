import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { isResponse, requireStaff } from "@lib/staff"

export const dynamic = "force-dynamic"

/** Applied MOS updates, newest first. Admins only. */
export async function GET() {
  const staff = await requireStaff()
  if (isResponse(staff)) return staff

  const revisions = await prisma.mosRevision.findMany({
    orderBy: { appliedAt: "desc" },
    take: 50,
    select: {
      id: true,
      fromCompilation: true,
      compilation: true,
      appliedAt: true,
      appliedById: true,
      moved: true,
      reworded: true,
      added: true,
      removed: true,
      flaggedLinks: true,
    },
  })
  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(revisions.map((r) => r.appliedById))] } },
    select: { id: true, firstName: true, lastName: true },
  })
  const names = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]))

  return NextResponse.json({
    revisions: revisions.map(({ appliedById, ...r }) => ({ ...r, appliedBy: names.get(appliedById) ?? null })),
  })
}
