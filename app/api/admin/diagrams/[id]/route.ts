import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { isResponse, requireStaff } from "@lib/staff"
import { readScene } from "@lib/diagrams/scene"

export const dynamic = "force-dynamic"

const OBJECT_ID = /^[a-f0-9]{24}$/i

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const { id } = await params
  if (!OBJECT_ID.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const diagram = await prisma.diagram.findUnique({ where: { id } })
  if (!diagram) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Always read through readScene: a scene written by a newer build opens here
  // minus anything this one can't draw, rather than breaking the editor.
  return NextResponse.json({
    diagram: { ...diagram, scene: readScene(diagram.scene) },
    role: staff.role,
  })
}

/** Saves the scene, the title, or the published render. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const { id } = await params
  if (!OBJECT_ID.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const data: Record<string, unknown> = {}

  if (body.scene !== undefined) {
    const scene = readScene(body.scene)
    data.scene = scene as unknown as object
    data.width = scene.width
    data.height = scene.height
  }
  if (typeof body.title === "string") {
    const title = body.title.replace(/\s+/g, " ").trim().slice(0, 120)
    if (!title) return NextResponse.json({ error: "Give it a name." }, { status: 400 })
    data.title = title
  }
  if (body.subjectId !== undefined) data.subjectId = body.subjectId || null
  if (typeof body.pngUrl === "string" && body.pngUrl.startsWith("/uploads/")) {
    data.pngUrl = body.pngUrl
    data.publishedAt = new Date()
  }

  if (!Object.keys(data).length) return NextResponse.json({ error: "Nothing to change." }, { status: 400 })

  try {
    const diagram = await prisma.diagram.update({ where: { id }, data, select: { id: true, updatedAt: true, pngUrl: true } })
    return NextResponse.json({ diagram })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff()
  if (isResponse(staff)) return staff

  const { id } = await params
  if (!OBJECT_ID.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.diagram.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
