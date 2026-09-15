import "server-only"

import { mkdir, stat, writeFile } from "fs/promises"
import path from "path"

/**
 * User uploads (avatars, forum and lesson images, course art).
 *
 * Why not public/: `next start` builds its list of static files once, at boot,
 * so anything written to public/ afterwards 404s until the server restarts.
 * Uploads live in their own directory and are streamed back by the
 * /uploads/[...path] route instead, which reads the disk on every request.
 *
 * Point UPLOAD_DIR at a persistent volume in production so uploads survive
 * redeploys. URLs stay `/uploads/...`, so nothing stored in the database changes.
 */
export const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "storage", "uploads"))

/** Where uploads used to be written. Still read, so existing URLs keep working. */
const LEGACY_ROOT = path.resolve(process.cwd(), "public", "uploads")

// No leading dot: blocks "..", "." and hidden files. nanoid ids may start with - or _.
const SAFE_SEGMENT = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,127}$/

export const UPLOAD_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
}

/** Saves a file and returns its public URL. `folder` and `filename` must be generated server-side. */
export async function saveUpload({ folder, filename, data }: { folder?: string; filename: string; data: Buffer }) {
  const segments = [...(folder ? folder.split("/") : []), filename]
  if (!segments.every((s) => SAFE_SEGMENT.test(s))) throw new Error(`Unsafe upload path: ${segments.join("/")}`)

  const dir = path.join(UPLOAD_ROOT, ...segments.slice(0, -1))
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, filename), data)
  return `/uploads/${segments.join("/")}`
}

/**
 * Maps URL segments to a file on disk, or null. Rejects anything that isn't a
 * plain name (no "..", no hidden files, no odd characters) and any extension
 * outside the image allowlist, then double-checks the result stays in the root.
 */
export async function resolveUpload(segments: string[]): Promise<{ file: string; size: number; mtime: Date; type: string } | null> {
  if (segments.length === 0 || segments.length > 4 || !segments.every((s) => SAFE_SEGMENT.test(s))) return null

  const type = UPLOAD_TYPES[path.extname(segments[segments.length - 1]).toLowerCase()]
  if (!type) return null

  for (const root of [UPLOAD_ROOT, LEGACY_ROOT]) {
    const file = path.resolve(root, ...segments)
    if (!file.startsWith(root + path.sep)) continue
    try {
      const info = await stat(file)
      if (info.isFile()) return { file, size: info.size, mtime: info.mtime, type }
    } catch {
      // Not in this root; try the next.
    }
  }
  return null
}
