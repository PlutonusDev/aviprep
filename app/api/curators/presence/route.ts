import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { getCurator } from "@lib/curators/session"
import { describeActivity } from "@lib/curators/presence"

export const dynamic = "force-dynamic"

/**
 * The studio's heartbeat. Cheap on purpose: one write, no reads beyond the
 * session, so it can run every minute per curator without being felt.
 */
export async function POST(request: Request) {
  const curator = await getCurator()
  if (!curator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const path = typeof body.path === "string" ? body.path.slice(0, 200) : "/admin"
  const { kind, label } = describeActivity(path, body.detail)

  await prisma.curator.update({
    where: { id: curator.id },
    data: { lastSeenAt: new Date(), activityKind: kind, activityLabel: label },
  })
  return new NextResponse(null, { status: 204 })
}
