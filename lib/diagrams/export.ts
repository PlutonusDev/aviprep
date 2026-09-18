/**
 * A diagram as a PNG, rendered in the browser.
 *
 * The route is SVG string -> blob URL -> <img> -> canvas -> PNG. Two things
 * make that harder than it sounds, and both are handled here:
 *
 *  - An SVG loaded into an <img> is a separate document with no network
 *    access, so any <image href="/uploads/..."> inside it silently renders
 *    blank. Every referenced image is fetched and inlined as a data URL first.
 *  - The fonts of that document are whatever the SVG asks for by name, and
 *    Inter may not resolve. The stack falls back to Arial, which is close
 *    enough for a label and always present.
 *
 * Client-only: it needs a DOM and a canvas.
 */

import { sceneToSvg } from "./render"
import type { DiagramNode, Scene } from "./scene"

/** How many device pixels per diagram unit. 2 keeps thin strokes crisp. */
export const EXPORT_SCALE = 2

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/**
 * Replaces every image reference in the scene with its bytes. Anything that
 * can't be fetched is dropped rather than left to render as a blank box.
 */
async function inlineImages(scene: Scene): Promise<Scene> {
  const urls = new Set<string>()
  for (const node of scene.nodes) if (node.kind === "image" && node.src) urls.add(node.src)
  if (scene.background.imageUrl) urls.add(scene.background.imageUrl)
  if (!urls.size) return scene

  const entries = await Promise.all([...urls].map(async (url) => [url, await toDataUrl(url)] as const))
  const data = new Map(entries.filter(([, value]) => value) as [string, string][])

  return {
    ...scene,
    background: {
      ...scene.background,
      imageUrl: scene.background.imageUrl ? (data.get(scene.background.imageUrl) ?? null) : null,
    },
    nodes: scene.nodes.flatMap<DiagramNode>((node) => {
      if (node.kind !== "image") return [node]
      const src = data.get(node.src)
      return src ? [{ ...node, src }] : []
    }),
  }
}

/** The finished diagram as PNG bytes. */
export async function sceneToPng(scene: Scene, { scale = EXPORT_SCALE, title = "" } = {}): Promise<Blob> {
  const svg = sceneToSvg(await inlineImages(scene), { idPrefix: "x-", title })
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }))

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error("The diagram couldn't be rasterised."))
      img.src = url
    })

    const canvas = document.createElement("canvas")
    canvas.width = Math.round(scene.width * scale)
    canvas.height = Math.round(scene.height * scale)
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("This browser can't render a canvas.")

    // The scene's own background is drawn into the SVG, but a transparent PNG
    // on a dark page looks broken, so the paper goes down first regardless.
    ctx.fillStyle = scene.background.colour || "#FFFFFF"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("The export came back empty."))), "image/png")
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Publishes the render and returns its /uploads URL. */
export async function publishPng(scene: Scene, title: string): Promise<string> {
  const png = await sceneToPng(scene, { title })
  const form = new FormData()
  form.append("file", new File([png], "diagram.png", { type: "image/png" }))

  const res = await fetch("/api/admin/questions/image", { method: "POST", body: form })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.url) throw new Error(data.error || "The render didn't upload.")
  return data.url as string
}

/** Saves a copy to the author's machine, for slides and handouts. */
export async function downloadPng(scene: Scene, title: string) {
  const png = await sceneToPng(scene, { title })
  const url = URL.createObjectURL(png)
  const link = document.createElement("a")
  link.href = url
  link.download = `${title.replace(/[^\w\- ]/g, "").trim() || "diagram"}.png`
  link.click()
  URL.revokeObjectURL(url)
}

/** The editable source, for anyone who wants it in Illustrator. */
export function downloadSvg(scene: Scene, title: string) {
  const url = URL.createObjectURL(new Blob([sceneToSvg(scene, { title })], { type: "image/svg+xml" }))
  const link = document.createElement("a")
  link.href = url
  link.download = `${title.replace(/[^\w\- ]/g, "").trim() || "diagram"}.svg`
  link.click()
  URL.revokeObjectURL(url)
}
