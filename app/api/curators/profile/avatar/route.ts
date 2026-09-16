import { NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { prisma } from "@lib/prisma"
import { getCurator } from "@lib/curators/session"
import { saveUpload } from "@lib/uploads"

const MAX_BYTES = 5 * 1024 * 1024

/** The file's real type from its first bytes, so a renamed file can't slip through. */
function sniff(data: Buffer): "jpg" | "png" | "webp" | null {
  if (data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "jpg"
  if (data.length > 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png"
  if (data.length > 12 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") return "webp"
  return null
}

/** Uploads a new profile picture (multipart "file"), stored on our own server. */
export async function POST(request: Request) {
  const curator = await getCurator()
  if (!curator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const form = await request.formData()
    const file = form.get("file")
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a photo." }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "That photo is over 5 MB. Try a smaller one." }, { status: 400 })

    const data = Buffer.from(await file.arrayBuffer())
    const ext = sniff(data)
    if (!ext) return NextResponse.json({ error: "Use a JPG, PNG or WebP photo." }, { status: 400 })

    const url = await saveUpload({ folder: "avatars", filename: `${nanoid()}.${ext}`, data })
    await prisma.curator.update({ where: { id: curator.id }, data: { profilePicture: url } })
    return NextResponse.json({ profilePicture: url })
  } catch (error) {
    console.error("Curator avatar upload failed:", error)
    return NextResponse.json({ error: "The upload didn't work. Try again." }, { status: 500 })
  }
}

export async function DELETE() {
  const curator = await getCurator()
  if (!curator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  await prisma.curator.update({ where: { id: curator.id }, data: { profilePicture: null } })
  return NextResponse.json({ profilePicture: null })
}
