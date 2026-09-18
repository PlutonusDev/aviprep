"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CheckCircle2, Clock, Loader2, MessageSquareWarning, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@lib/utils"

/**
 * Sending a course for review, on the screen where it was built.
 *
 * A course is reviewed whole - its modules and lessons go with it - so this is
 * the one place a curator hands work over, and it belongs here rather than in a
 * menu on the list behind them.
 */
export function CourseSubmit({
  courseId,
  reviewStatus,
  canSubmit,
  lessonCount,
  feedback,
  onSubmitted,
  className,
}: {
  courseId: string
  /** null | "review" | "changes" | "rejected" */
  reviewStatus?: string | null
  /** They've written something in this course. Shells they haven't touched aren't theirs to hand over. */
  canSubmit: boolean
  lessonCount: number
  /** The last thing an admin said, when they asked for changes. */
  feedback?: string | null
  onSubmitted: () => void
  className?: string
}) {
  const [note, setNote] = useState("")
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", note: note.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "That didn't send.")
        return
      }
      setNote("")
      setOpen(false)
      toast.success("Sent for review. We'll come back to you here.")
      onSubmitted()
    } finally {
      setBusy(false)
    }
  }

  if (reviewStatus === "review") {
    return (
      <div className={cn("flex items-center gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3", className)}>
        <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-foreground">
          With a reviewer. You can keep editing; they&apos;ll see the latest version.
        </p>
      </div>
    )
  }

  const returned = reviewStatus === "changes" || reviewStatus === "rejected"
  const empty = lessonCount === 0
  const blocked = empty || !canSubmit

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3.5",
        returned ? "border-warning/50 bg-warning/[0.07]" : "border-primary/30 bg-primary/[0.04]",
        className,
      )}
    >
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        {returned ? (
          <MessageSquareWarning className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        )}

        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">
            {reviewStatus === "rejected"
              ? "This course was declined"
              : returned
                ? "Changes were requested"
                : "Ready for review?"}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {!canSubmit
              ? "Write a lesson in this course first. You can only send work you've had a hand in."
              : empty
                ? "Add a lesson first. A course goes for review with its modules and lessons."
                : returned
                  ? "Make the changes and send it back."
                  : "The whole course goes at once, modules and lessons included."}
          </p>
          {returned && feedback && (
            <p className="mt-2 whitespace-pre-line rounded-lg bg-background/70 px-3 py-2 text-sm text-foreground">{feedback}</p>
          )}
        </div>

        {!open && (
          <Button onClick={() => setOpen(true)} disabled={blocked} className="h-10 shrink-0 gap-2">
            <Send className="h-4 w-4" aria-hidden="true" />
            {returned ? "Resubmit" : "Submit for review"}
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
          <label htmlFor="submit-note" className="text-sm font-medium text-foreground">
            Anything the reviewer should know?
          </label>
          <Textarea
            id="submit-note"
            rows={2}
            autoFocus
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional. e.g. Still deciding whether module 3 belongs here."
            className="resize-none bg-background"
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" size="sm" className="h-9" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" className="h-9 gap-1.5" onClick={submit} disabled={busy}>
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              Send
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
