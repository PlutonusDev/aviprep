import { NextResponse } from "next/server"
import { isResponse, requireStaff } from "@lib/staff"
import { CONTENT_TYPES, curatorOwns, decide, reviewDetail, type ContentType, type ReviewAction } from "@lib/review/review"

const ACTIONS: ReviewAction[] = ["approve", "request-changes", "reject", "comment"]

async function target(params: Promise<{ type: string; id: string }>) {
  const { type, id } = await params
  if (!CONTENT_TYPES.includes(type as ContentType) || !/^[a-f0-9]{24}$/i.test(id)) return null
  return { type: type as ContentType, id }
}

/**
 * The full review record: content, proposed changes, MOS links, people and the
 * timeline. Admins see anything; curators see their own work, so they can read
 * feedback and reply.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const t = await target(params)
  if (!t) return NextResponse.json({ error: "Not found." }, { status: 404 })
  if (!staff.isAdmin && !(await curatorOwns(t.type, t.id, staff.userId))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 })
  }

  const detail = await reviewDetail(t.type, t.id)
  if (!detail) return NextResponse.json({ error: "Not found." }, { status: 404 })
  return NextResponse.json({ detail })
}

/** { action: "approve" | "request-changes" | "reject" | "comment", message?, points?, award? } */
export async function POST(request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const t = await target(params)
  if (!t) return NextResponse.json({ error: "Not found." }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  if (!ACTIONS.includes(body.action)) return NextResponse.json({ error: "Unknown action." }, { status: 400 })

  try {
    const result = await decide({
      type: t.type,
      id: t.id,
      action: body.action,
      message: typeof body.message === "string" ? body.message : null,
      points: typeof body.points === "number" ? body.points : undefined,
      award: typeof body.award === "number" ? body.award : null,
      staff,
    })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({ detail: await reviewDetail(t.type, t.id) })
  } catch (error) {
    console.error("Review decision error:", error)
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 })
  }
}
