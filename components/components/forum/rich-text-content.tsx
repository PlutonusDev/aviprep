"use client"

import { useMemo } from "react"
import { sanitizeHtml } from "@lib/sanitize-html"
import { cn } from "@lib/utils"

/** Renders a stored post. Always sanitised - never pass raw HTML to innerHTML. */
export function RichTextContent({ html, className }: { html: string; className?: string }) {
  const safe = useMemo(() => sanitizeHtml(html), [html])
  return <div className={cn("rich-text", className)} dangerouslySetInnerHTML={{ __html: safe }} />
}
