"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, MessagesSquare } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useUser } from "@lib/user-context"
import { PersonChip, ReviewThread } from "./review-thread"
import type { ContentType, ReviewDetail } from "./types"

/**
 * The review conversation for one piece of content, shown in its editor.
 * Curators read feedback and reply here; admins get a link to the full review.
 */
export function ReviewActivity({ type, id }: { type: ContentType; id: string }) {
  const { user } = useUser()
  const [detail, setDetail] = useState<ReviewDetail | null>(null)
  const [state, setState] = useState<"loading" | "ready" | "hidden">("loading")

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/review/${type}/${id}`)
      if (!res.ok) return setState("hidden")
      setDetail((await res.json()).detail)
      setState("ready")
    } catch {
      setState("hidden")
    }
  }, [type, id])

  useEffect(() => {
    load()
  }, [load])

  if (state === "hidden") return null

  return (
    <section aria-labelledby={`activity-${id}`} className="rounded-xl border border-border bg-card p-4 shadow-e1 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <MessagesSquare className="h-4 w-4 text-primary" aria-hidden="true" />
          </span>
          <div>
            <h2 id={`activity-${id}`} className="text-sm font-semibold text-foreground">
              Review activity
            </h2>
            {detail?.author && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Written by <PersonChip person={detail.author} />
              </p>
            )}
          </div>
        </div>
        {user?.isAdmin && detail?.inQueue && (
          <Link
            href={`/admin/review?item=${type}:${id}`}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Review it
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>

      {state === "loading" || !detail ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <ReviewThread
          type={type}
          id={id}
          events={detail.events}
          onChange={setDetail}
          placeholder={user?.isAdmin ? "Comment for the author" : "Ask a question or reply to feedback"}
          emptyText="No review activity yet. Submitting it for review starts the conversation."
        />
      )}
    </section>
  )
}
