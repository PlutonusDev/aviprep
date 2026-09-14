import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { mkdir, writeFile } from "fs/promises"
import path from "path"
import sharp from "sharp"
import { nanoid } from "nanoid"
import { verifyToken } from "@lib/auth"
import { prisma } from "@lib/prisma"

const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED = ["image/png", "image/jpeg", "image/webp"]

/**
 * Where generated card art lives on disk. Defaults to public/uploads/course-art
 * so a stock `next start` serves it straight back at /uploads/course-art/...
 * Point UPLOAD_DIR at a mounted volume to keep media off the deploy artifact;
 * it must still resolve inside public/ for the static handler to serve it.
 */
const UPLOAD_SUBDIR = "uploads/course-art"
const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(process.cwd(), "public", UPLOAD_SUBDIR)

async function requireAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get("session")?.value
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, isAdmin: true },
  })

  return user?.isAdmin ? user : null
}

/** Every course, so the tool can offer one picker rather than a licence filter. */
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const courses = await prisma.course.findMany({
    select: { id: true, title: true, subjectId: true, thumbnail: true },
    orderBy: [{ subjectId: "asc" }, { order: "asc" }],
  })

  return NextResponse.json({ courses })
}

/**
 * Stores a generated card image on this server and, when a courseId is given,
 * points that course's thumbnail at it.
 */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file")
    const slug = String(formData.get("slug") || "card")
    const courseId = formData.get("courseId") ? String(formData.get("courseId")) : null

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: `Unsupported type ${file.type}` }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image too large (max 8MB)" }, { status: 400 })
    }

    const safeSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 60) || "card"
    // A unique name per save, so regenerating never overwrites art a course is
    // still pointing at, and caches never serve a stale image.
    const filename = `${safeSlug}-${nanoid(8)}.webp`

    const input = Buffer.from(await file.arrayBuffer())
    // Flat vector-derived art compresses far better as webp than as PNG.
    const output = await sharp(input).webp({ quality: 90 }).toBuffer()

    await mkdir(UPLOAD_DIR, { recursive: true })
    await writeFile(path.join(UPLOAD_DIR, filename), output)

    const url = `/${UPLOAD_SUBDIR}/${filename}`

    if (courseId) {
      await prisma.course.update({
        where: { id: courseId },
        data: { thumbnail: url },
      })
    }

    return NextResponse.json({ url, bytes: output.byteLength, courseId })
  } catch (error) {
    console.error("Branding upload failed:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
