"use client"

import type React from "react"
import { useState } from "react"
import { format, formatDistanceToNowStrict } from "date-fns"
import { toast } from "sonner"
import { CheckCircle2, CornerUpLeft, Loader2, MessageCircle, Send, Upload, XCircle } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { credentialLabel } from "@lib/curators/details"
import { cn } from "@lib/utils"
import type { ContentType, EventAction, Person, ReviewDetail, TimelineEvent } from "./types"

const ACTIONS: Record<EventAction, { verb: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  submitted: { verb: "submitted it for review", icon: Upload, tone: "bg-muted text-muted-foreground" },
  comment: { verb: "commented", icon: MessageCircle, tone: "bg-muted text-muted-foreground" },
  approved: { verb: "approved it", icon: CheckCircle2, tone: "bg-success/15 text-success" },
  "changes-requested": { verb: "asked for changes", icon: CornerUpLeft, tone: "bg-warning/15 text-warning" },
  rejected: { verb: "rejected it", icon: XCircle, tone: "bg-destructive/10 text-destructive" },
}

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  )
}

export function PersonChip({ person, size = "sm", showCredentials = false }: { person: Person | null; size?: "sm" | "md"; showCredentials?: boolean }) {
  if (!person) return <span className="text-sm text-muted-foreground">Unknown</span>
  const credentials = person.credentials.filter((c) => c !== "none")
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar className={cn("shrink-0", size === "md" ? "h-9 w-9" : "h-6 w-6")}>
        <AvatarFallback className={cn("bg-primary/10 font-semibold text-foreground", size === "md" ? "text-sm" : "text-[10px]")}>
          {initials(person.name)}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0">
        <span className={cn("flex items-center gap-1.5 truncate font-medium text-foreground", size === "md" ? "text-sm" : "text-xs")}>
          {person.name}
          {person.role === "admin" && (
            <span className="rounded border border-primary/30 bg-primary/10 px-1 text-[10px] font-semibold uppercase tracking-wide">Admin</span>
          )}
        </span>
        {showCredentials && credentials.length > 0 && (
          <span className="mt-0.5 flex flex-wrap gap-1">
            {credentials.map((c) => (
              <span key={c} title={credentialLabel(c)} className="rounded border border-border bg-muted/60 px-1.5 text-[11px] text-muted-foreground">
                {credentialLabel(c, true)}
              </span>
            ))}
          </span>
        )}
      </span>
    </span>
  )
}

function Event({ event, last }: { event: TimelineEvent; last: boolean }) {
  const meta = ACTIONS[event.action] ?? ACTIONS.comment
  const Icon = meta.icon
  const at = new Date(event.createdAt)
  return (
    <li className="relative flex gap-3 pb-5">
      {!last && <span aria-hidden="true" className="absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-px bg-border" />}
      <span className={cn("relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", meta.tone)}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{event.actor?.name ?? "Someone"}</span> {meta.verb}
          {event.kind === "edit" && event.action === "submitted" ? " as an edit" : ""}
          <span aria-hidden="true"> · </span>
          <time dateTime={event.createdAt} title={format(at, "d MMM yyyy, h:mm a")}>
            {formatDistanceToNowStrict(at, { addSuffix: true })}
          </time>
        </p>
        {event.message && (
          <p
            className={cn(
              "mt-2 whitespace-pre-line rounded-lg border px-3 py-2.5 text-sm text-foreground",
              event.action === "changes-requested" && "border-warning/40 bg-warning/5",
              event.action === "rejected" && "border-destructive/30 bg-destructive/5",
              (event.action === "comment" || event.action === "submitted" || event.action === "approved") && "border-border bg-card",
            )}
          >
            {event.message}
          </p>
        )}
      </div>
    </li>
  )
}

/**
 * The review conversation: every submission, comment and decision, plus a box
 * to reply. Admins and the curator who owns the work both use it.
 */
export function ReviewThread({
  type,
  id,
  events,
  onChange,
  canComment = true,
  placeholder = "Add a comment",
  emptyText = "No activity yet.",
}: {
  type: ContentType
  id: string
  events: TimelineEvent[]
  onChange?: (detail: ReviewDetail) => void
  canComment?: boolean
  placeholder?: string
  emptyText?: string
}) {
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/admin/review/${type}/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "comment", message }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return toast.error(data.error || "Your comment didn't send.")
      setMessage("")
      onChange?.(data.detail)
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      {events.length === 0 ? (
        <p className="pb-4 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ol aria-label="Review history">
          {events.map((event, i) => (
            <Event key={event.id} event={event} last={i === events.length - 1 && !canComment} />
          ))}
        </ol>
      )}
      {canComment && (
        <form onSubmit={send} className="flex gap-3">
          <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
            <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <label htmlFor={`comment-${type}-${id}`} className="sr-only">
              Comment
            </label>
            <Textarea
              id={`comment-${type}-${id}`}
              rows={2}
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(e as unknown as React.FormEvent)
              }}
              placeholder={placeholder}
              className="resize-none bg-background"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="hidden text-xs text-muted-foreground sm:inline">Ctrl + Enter to send</span>
              <Button type="submit" size="sm" variant="outline" className="h-9 gap-1.5" disabled={sending || !message.trim()}>
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />}
                Comment
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
