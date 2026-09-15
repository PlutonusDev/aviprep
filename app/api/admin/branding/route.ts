import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { saveUpload } from "@lib/uploads"
import sharp from "sharp"
import { nanoid } from "nanoid"
import { verifyToken } from "@lib/auth"
import { prisma } from "@lib/prisma"

const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED = ["image/png", "image/jpeg", "image/webp"]

/** Card art is stored with other uploads (lib/uploads.ts), under this folder. */
const UPLOAD_FOLDER = "course-art"

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

    const url = await saveUpload({ folder: UPLOAD_FOLDER, filename, data: output })

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
