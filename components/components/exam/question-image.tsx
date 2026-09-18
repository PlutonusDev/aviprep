"use client"

import { useState } from "react"
import { Expand, ImageOff } from "lucide-react"
import { cn } from "@lib/utils"

/**
 * The chart or diagram a question is asked about.
 *
 * Charts get read closely - a student needs to trace a line to an axis - so it
 * opens full screen on a tap, and the alt text is the author's own description
 * rather than a filename. Sized by its own aspect ratio once loaded, so the
 * page doesn't jump when it arrives.
 */
export function QuestionImage({
  src,
  alt,
  className,
}: {
  src: string
  alt?: string | null
  className?: string
}) {
  const [zoomed, setZoomed] = useState(false)
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className={cn("flex items-center gap-2.5 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground", className)}>
        <ImageOff className="h-4 w-4 shrink-0" aria-hidden="true" />
        <p>{alt || "The image for this question couldn't be loaded."}</p>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setZoomed(true)}
        aria-label={alt ? `${alt}. Open full size.` : "Open the image full size"}
        className={cn(
          "group relative block w-full overflow-hidden rounded-xl border border-border bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        {/* Plain img: these are author uploads of unknown dimensions, and the
            exam needs them at their natural aspect ratio without a layout jump. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt || ""}
          onError={() => setFailed(true)}
          className="mx-auto block max-h-[46vh] w-auto max-w-full object-contain"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-foreground/70 text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          <Expand className="h-3.5 w-3.5" />
        </span>
      </button>

      {zoomed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt || "Question image"}
          onClick={() => setZoomed(false)}
          onKeyDown={(e) => e.key === "Escape" && setZoomed(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 p-4 backdrop-blur-sm"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt || ""} className="max-h-full max-w-full rounded-lg bg-white object-contain" />
          <button
            type="button"
            autoFocus
            onClick={() => setZoomed(false)}
            className="absolute right-4 top-4 rounded-md bg-background px-3 py-1.5 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Close
          </button>
        </div>
      )}
    </>
  )
}
