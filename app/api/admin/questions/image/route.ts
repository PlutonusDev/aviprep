import { NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { isResponse, requireStaff } from "@lib/staff"
import { saveUpload } from "@lib/uploads"

const MAX_BYTES = 8 * 1024 * 1024

/** The file's real type from its first bytes, so a renamed file can't slip through. */
function sniff(data: Buffer): "jpg" | "png" | "webp" | null {
  if (data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "jpg"
  if (data.length > 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png"
  if (data.length > 12 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") return "webp"
  return null
}

/**
 * A chart or diagram for a question (multipart "file"), stored on our own
 * server. Curators upload their own; the URL goes on the question.
 */
export async function POST(request: Request) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  try {
    const form = await request.formData()
    const file = form.get("file")
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image." }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "That image is over 8 MB. Try a smaller one." }, { status: 400 })

    const data = Buffer.from(await file.arrayBuffer())
    const ext = sniff(data)
    if (!ext) return NextResponse.json({ error: "Use a JPG, PNG or WebP image." }, { status: 400 })

    const url = await saveUpload({ folder: "questions", filename: `${nanoid()}.${ext}`, data })
    return NextResponse.json({ url })
  } catch (error) {
    console.error("Question image upload failed:", error)
    return NextResponse.json({ error: "The upload didn't work. Try again." }, { status: 500 })
  }
}
