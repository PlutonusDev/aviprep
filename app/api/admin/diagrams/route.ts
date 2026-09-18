import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { isResponse, requireStaff } from "@lib/staff"
import { blankScene } from "@lib/diagrams/scene"

export const dynamic = "force-dynamic"

const title = (value: unknown) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 120) : ""

/** Every diagram, newest first. Filtered by subject with ?subject=. */
export async function GET(request: Request) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const subject = new URL(request.url).searchParams.get("subject")
  const diagrams = await prisma.diagram.findMany({
    where: subject ? { subjectId: subject } : undefined,
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, subjectId: true, width: true, height: true, pngUrl: true, publishedAt: true, updatedAt: true },
  })
  return NextResponse.json({ diagrams, role: staff.role })
}

/** Starts a new one. The canvas size is chosen up front; everything else isn't. */
export async function POST(request: Request) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const body = await request.json().catch(() => ({}))
  const name = title(body.title) || "Untitled diagram"
  const width = Number.isFinite(body.width) ? Math.min(4000, Math.max(200, Number(body.width))) : 1200
  const height = Number.isFinite(body.height) ? Math.min(4000, Math.max(200, Number(body.height))) : 675

  const diagram = await prisma.diagram.create({
    data: {
      title: name,
      subjectId: typeof body.subjectId === "string" && body.subjectId ? body.subjectId : null,
      scene: blankScene(width, height) as unknown as object,
      width,
      height,
      authorId: staff.userId,
    },
    select: { id: true },
  })
  return NextResponse.json({ id: diagram.id })
}
