import { createReadStream } from "fs"
import { Readable } from "stream"
import { resolveUpload } from "@lib/uploads"

// Reads the disk on every request, which is the whole point: new uploads are
// served immediately, with no restart.
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const found = await resolveUpload(path)
  if (!found) return new Response("Not found", { status: 404 })

  // Upload filenames are random and never reused, so the content at a URL never
  // changes: browsers can cache it for good.
  const etag = `"${found.size.toString(16)}-${found.mtime.getTime().toString(16)}"`
  const headers = new Headers({
    "Content-Type": found.type,
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: etag,
    "Last-Modified": found.mtime.toUTCString(),
    // Only ever render as the image it claims to be.
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
  })

  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers })
  }

  headers.set("Content-Length", String(found.size))
  const stream = Readable.toWeb(createReadStream(found.file)) as ReadableStream
  return new Response(stream, { status: 200, headers })
}

export const HEAD = GET
