"use client"

import type React from "react"
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { format, isSameDay, isToday, isYesterday, differenceInCalendarDays } from "date-fns"
import { ArrowDown, ArrowLeft, Loader2, MessageSquare, PenSquare, RotateCcw, Search, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { UserAvatar, fullName } from "@/components/forum/forum-ui"
import { useUser } from "@lib/user-context"
import { cn } from "@lib/utils"

const THREAD_POLL_MS = 4000
const LIST_POLL_MS = 15000
const MAX_LENGTH = 2000

interface Person {
  id: string
  firstName: string
  lastName: string
  profilePicture: string | null
}

interface Message {
  id: string
  content: string
  createdAt: string
  sender: Person
  /** Client-only: still sending, or failed to send. */
  status?: "sending" | "failed"
}

interface Conversation {
  partnerId: string
  partner: Person
  lastMessage: { content: string; createdAt: string; senderId: string }
  unreadCount: number
}

/** "2:14 pm" today, "Yesterday", "Mon" this week, then "12 Mar". */
function listTime(iso: string) {
  const d = new Date(iso)
  if (isToday(d)) return format(d, "h:mm a").toLowerCase()
  if (isYesterday(d)) return "Yesterday"
  if (differenceInCalendarDays(new Date(), d) < 7) return format(d, "EEE")
  return format(d, "d MMM")
}

function dayLabel(d: Date) {
  if (isToday(d)) return "Today"
  if (isYesterday(d)) return "Yesterday"
  return format(d, "EEEE d MMMM")
}

/** Run while the tab is visible; paused in the background. */
function useVisibleInterval(fn: () => void, ms: number, enabled = true) {
  const saved = useRef(fn)
  saved.current = fn
  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") saved.current()
    }, ms)
    const onVisible = () => document.visibilityState === "visible" && saved.current()
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [ms, enabled])
}

export default function MessagesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useUser()
  const partnerId = searchParams.get("to")

  const [conversations, setConversations] = useState<Conversation[] | null>(null)
  const [listError, setListError] = useState(false)
  const [filter, setFilter] = useState("")
  const [composeOpen, setComposeOpen] = useState(false)

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages")
      if (!res.ok) throw new Error()
      setConversations(await res.json())
      setListError(false)
    } catch {
      setListError(true)
    }
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])
  useVisibleInterval(loadConversations, LIST_POLL_MS)

  // The open conversation lives in the URL, so refresh, back and deep links work.
  const openConversation = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (id) params.set("to", id)
      else params.delete("to")
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return (conversations ?? []).filter((c) => !q || fullName(c.partner).toLowerCase().includes(q))
  }, [conversations, filter])

  const unreadTotal = (conversations ?? []).reduce((n, c) => n + c.unreadCount, 0)
  const knownPartner = conversations?.find((c) => c.partnerId === partnerId)?.partner ?? null

  return (
    <div className="mx-auto w-full max-w-6xl p-4 lg:p-8">
      <div className="flex h-[calc(100dvh-4rem-2rem)] overflow-hidden rounded-xl border border-border bg-card shadow-e1 lg:h-[calc(100dvh-4rem-4rem)]">
        {/* Conversation list */}
        <aside
          aria-label="Conversations"
          className={cn(
            "flex w-full flex-col border-border md:w-80 md:shrink-0 md:border-r",
            partnerId && "hidden md:flex",
          )}
        >
          <div className="space-y-3 border-b border-border p-4">
            <div className="flex items-center justify-between gap-2">
              <h1 className="font-heading text-xl font-bold text-foreground">
                Messages
                {unreadTotal > 0 && <span className="sr-only">, {unreadTotal} unread</span>}
              </h1>
              <Button size="sm" className="h-9 gap-1.5" onClick={() => setComposeOpen(true)}>
                <PenSquare className="h-4 w-4" aria-hidden="true" />
                New
              </Button>
            </div>
            {(conversations?.length ?? 0) > 4 && (
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search conversations"
                  aria-label="Search conversations"
                  className="h-9 pl-9"
                />
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {conversations === null ? (
              listError ? (
                <ListNotice text="Couldn't load your messages.">
                  <Button variant="outline" size="sm" className="h-9" onClick={loadConversations}>
                    Try again
                  </Button>
                </ListNotice>
              ) : (
                <div className="space-y-1 p-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3.5 w-1/2" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : conversations.length === 0 ? (
              <ListNotice text="No conversations yet.">
                <Button variant="outline" size="sm" className="h-9" onClick={() => setComposeOpen(true)}>
                  Start one
                </Button>
              </ListNotice>
            ) : visible.length === 0 ? (
              <ListNotice text={`No one matches "${filter}".`} />
            ) : (
              <ul className="p-2">
                {visible.map((c) => (
                  <li key={c.partnerId}>
                    <ConversationRow
                      conversation={c}
                      active={c.partnerId === partnerId}
                      mine={c.lastMessage.senderId === user?.id}
                      onSelect={() => openConversation(c.partnerId)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Thread */}
        <section
          aria-label="Conversation"
          className={cn("min-w-0 flex-1 flex-col", partnerId ? "flex" : "hidden md:flex")}
        >
          {partnerId ? (
            <Thread
              key={partnerId}
              partnerId={partnerId}
              knownPartner={knownPartner}
              currentUserId={user?.id}
              onBack={() => openConversation(null)}
              onActivity={loadConversations}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <MessageSquare className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              </span>
              <p className="mt-4 font-semibold text-foreground">Your messages</p>
              <p className="mt-1 text-sm text-muted-foreground">Pick a conversation, or start a new one.</p>
            </div>
          )}
        </section>
      </div>

      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        onPick={(person) => {
          setComposeOpen(false)
          openConversation(person.id)
        }}
      />
    </div>
  )
}

function ListNotice({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      {children}
    </div>
  )
}

function ConversationRow({
  conversation: c,
  active,
  mine,
  onSelect,
}: {
  conversation: Conversation
  active: boolean
  mine: boolean
  onSelect: () => void
}) {
  const unread = c.unreadCount > 0
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        active ? "bg-muted" : "hover:bg-muted/60",
      )}
    >
      <UserAvatar
        firstName={c.partner.firstName}
        lastName={c.partner.lastName}
        src={c.partner.profilePicture}
        className="h-10 w-10 shrink-0"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn("truncate text-sm text-foreground", unread ? "font-semibold" : "font-medium")}>
            {fullName(c.partner)}
          </span>
          <span className={cn("shrink-0 text-xs", unread ? "font-medium text-primary" : "text-muted-foreground")}>
            {listTime(c.lastMessage.createdAt)}
          </span>
        </span>
        <span className="mt-0.5 flex items-center justify-between gap-2">
          <span className={cn("truncate text-sm", unread ? "text-foreground" : "text-muted-foreground")}>
            {mine && "You: "}
            {c.lastMessage.content}
          </span>
          {unread && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
              {c.unreadCount > 99 ? "99+" : c.unreadCount}
              <span className="sr-only"> unread</span>
            </span>
          )}
        </span>
      </span>
    </button>
  )
}

/* --- Thread --------------------------------------------------------------------- */

function Thread({
  partnerId,
  knownPartner,
  currentUserId,
  onBack,
  onActivity,
}: {
  partnerId: string
  knownPartner: Person | null
  currentUserId?: string
  onBack: () => void
  onActivity: () => void
}) {
  const [partner, setPartner] = useState<Person | null>(knownPartner)
  const [messages, setMessages] = useState<Message[]>([])
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading")
  const [draft, setDraft] = useState("")
  const [unseenBelow, setUnseenBelow] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const nearBottom = useRef(true)
  const forceScroll = useRef(true)

  // Newest confirmed message, for incremental polling.
  const lastStamp = useMemo(() => {
    const confirmed = messages.filter((m) => !m.status)
    return confirmed[confirmed.length - 1]?.createdAt ?? null
  }, [messages])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/messages/${partnerId}`)
      .then(async (res) => {
        if (cancelled) return
        if (res.status === 404) return setStatus("missing")
        if (!res.ok) throw new Error()
        const data = await res.json()
        setPartner(data.partner)
        setMessages(data.messages)
        setStatus("ready")
        onActivity() // clears the unread badge in the list
      })
      .catch(() => !cancelled && setStatus("error"))
    return () => {
      cancelled = true
    }
    // onActivity is stable (useCallback); partnerId is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId])

  useEffect(() => {
    if (status === "ready") inputRef.current?.focus({ preventScroll: true })
  }, [status])

  const poll = useCallback(async () => {
    if (status !== "ready") return
    try {
      const qs = lastStamp ? `?after=${encodeURIComponent(lastStamp)}` : ""
      const res = await fetch(`/api/messages/${partnerId}${qs}`)
      if (!res.ok) return
      const data: { messages: Message[] } = await res.json()
      if (!data.messages.length) return
      setMessages((prev) => {
        const known = new Set(prev.map((m) => m.id))
        const fresh = data.messages.filter((m) => !known.has(m.id))
        return fresh.length ? [...prev, ...fresh] : prev
      })
      if (data.messages.some((m) => m.sender.id !== currentUserId)) onActivity()
    } catch {
      // Try again next tick.
    }
  }, [status, lastStamp, partnerId, currentUserId, onActivity])

  useVisibleInterval(poll, THREAD_POLL_MS, status === "ready")

  // Stay pinned to the bottom when already there; otherwise offer a jump button.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (forceScroll.current || nearBottom.current) {
      el.scrollTop = el.scrollHeight
      forceScroll.current = false
      setUnseenBelow(false)
    } else {
      setUnseenBelow(true)
    }
  }, [messages])

  function onScroll() {
    const el = scrollRef.current
    if (!el) return
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    if (nearBottom.current) setUnseenBelow(false)
  }

  // Grow the textarea with its content, up to a limit.
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [draft])

  async function send(content: string, retryId?: string) {
    const text = content.trim()
    if (!text || text.length > MAX_LENGTH || !currentUserId) return
    const tempId = retryId ?? `temp-${Date.now()}`
    const me: Person = { id: currentUserId, firstName: "", lastName: "", profilePicture: null }

    forceScroll.current = true
    setMessages((prev) =>
      retryId
        ? prev.map((m) => (m.id === retryId ? { ...m, status: "sending" } : m))
        : [...prev, { id: tempId, content: text, createdAt: new Date().toISOString(), sender: me, status: "sending" }],
    )
    if (!retryId) setDraft("")

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: partnerId, content: text }),
      })
      if (!res.ok) throw new Error()
      const saved: Message = await res.json()
      // Replace the placeholder, unless polling already brought the real one in.
      setMessages((prev) =>
        prev.some((m) => m.id === saved.id)
          ? prev.filter((m) => m.id !== tempId)
          : prev.map((m) => (m.id === tempId ? saved : m)),
      )
      onActivity()
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)))
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send(draft)
    }
  }

  const name = partner ? fullName(partner) : ""
  const over = draft.length > MAX_LENGTH

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-3 sm:px-4">
        <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden" onClick={onBack} aria-label="Back to conversations">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Button>
        {partner ? (
          <>
            <UserAvatar firstName={partner.firstName} lastName={partner.lastName} src={partner.profilePicture} className="h-9 w-9" />
            <h2 className="truncate font-semibold text-foreground">{name}</h2>
          </>
        ) : status === "loading" ? (
          <Skeleton className="h-5 w-40" />
        ) : null}
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="h-full overflow-y-auto px-3 py-4 sm:px-6"
          role="log"
          aria-live="polite"
          aria-label={name ? `Messages with ${name}` : "Messages"}
        >
          {status === "loading" ? (
            <div className="space-y-3">
              {[40, 64, 52, 30].map((w, i) => (
                <Skeleton key={i} className={cn("h-10 rounded-2xl", i % 2 ? "ml-auto" : "")} style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : status === "missing" ? (
            <Centered title="Member not found" text="They may have left AviPrep." />
          ) : status === "error" ? (
            <Centered title="Couldn't load this conversation" text="Try again in a moment." />
          ) : messages.length === 0 ? (
            <Centered title={`Say hello to ${partner?.firstName ?? "them"}`} text="Messages are private between the two of you." />
          ) : (
            <MessageList messages={messages} currentUserId={currentUserId} onRetry={(m) => send(m.content, m.id)} />
          )}
        </div>

        {unseenBelow && (
          <button
            type="button"
            onClick={() => {
              const el = scrollRef.current
              if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
              setUnseenBelow(false)
            }}
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-popover px-3 py-1.5 text-xs font-medium text-foreground shadow-e2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
            New messages
          </button>
        )}
      </div>

      {(status === "ready" || status === "loading") && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(draft)
          }}
          className="shrink-0 border-t border-border p-3 sm:p-4"
        >
          <div className="flex items-end gap-2 rounded-xl border border-input bg-background p-1.5 pl-3 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
            <label htmlFor="message-input" className="sr-only">
              Message {name}
            </label>
            <textarea
              id="message-input"
              ref={inputRef}
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={name ? `Message ${partner?.firstName}` : "Write a message"}
              disabled={status !== "ready"}
              aria-invalid={over}
              aria-describedby="message-hint"
              className="max-h-40 min-h-9 flex-1 resize-none bg-transparent py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <Button
              type="submit"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-lg"
              disabled={!draft.trim() || over || status !== "ready"}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <p id="message-hint" className="mt-1.5 flex justify-between px-1 text-xs text-muted-foreground">
            <span className="hidden sm:inline">Enter to send, Shift + Enter for a new line</span>
            {draft.length > MAX_LENGTH - 200 && (
              <span className={cn("ml-auto", over && "font-medium text-destructive")} data-tabular>
                {draft.length}/{MAX_LENGTH}
              </span>
            )}
          </p>
        </form>
      )}
    </>
  )
}

function Centered({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

function MessageList({
  messages,
  currentUserId,
  onRetry,
}: {
  messages: Message[]
  currentUserId?: string
  onRetry: (m: Message) => void
}) {
  return (
    <ol className="space-y-0.5">
      {messages.map((m, i) => {
        const prev = messages[i - 1]
        const next = messages[i + 1]
        const at = new Date(m.createdAt)
        const own = m.sender.id === currentUserId
        const newDay = !prev || !isSameDay(new Date(prev.createdAt), at)
        // Messages from the same person within 5 minutes read as one group.
        const groupedWithPrev =
          !newDay && prev.sender.id === m.sender.id && at.getTime() - new Date(prev.createdAt).getTime() < 5 * 60_000
        const groupedWithNext =
          !!next &&
          next.sender.id === m.sender.id &&
          isSameDay(new Date(next.createdAt), at) &&
          new Date(next.createdAt).getTime() - at.getTime() < 5 * 60_000

        return (
          <Fragment key={m.id}>
            {newDay && (
              <li className="flex justify-center py-3">
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {dayLabel(at)}
                </span>
              </li>
            )}
            <li className={cn("flex flex-col", own ? "items-end" : "items-start", !groupedWithPrev && !newDay && "pt-2")}>
              <div
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed [overflow-wrap:anywhere] sm:max-w-[70%]",
                  own ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                  own && groupedWithNext && "rounded-br-md",
                  own && groupedWithPrev && "rounded-tr-md",
                  !own && groupedWithNext && "rounded-bl-md",
                  !own && groupedWithPrev && "rounded-tl-md",
                  m.status === "sending" && "opacity-70",
                  m.status === "failed" && "bg-destructive/10 text-foreground ring-1 ring-destructive/40",
                )}
              >
                {m.content}
              </div>
              {m.status === "failed" ? (
                <button
                  type="button"
                  onClick={() => onRetry(m)}
                  className="mt-1 flex items-center gap-1 text-xs font-medium text-destructive hover:underline"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  Not sent. Tap to retry
                </button>
              ) : !groupedWithNext ? (
                <span className="mt-1 px-1 text-[11px] text-muted-foreground">
                  {m.status === "sending" ? "Sending..." : <time dateTime={m.createdAt}>{format(at, "h:mm a").toLowerCase()}</time>}
                </span>
              ) : null}
            </li>
          </Fragment>
        )
      })}
    </ol>
  )
}

/* --- Compose -------------------------------------------------------------------- */

function ComposeDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (person: Person) => void
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Person[]>([])
  const [searching, setSearching] = useState(false)
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (!open) {
      setQuery("")
      setResults([])
    }
  }, [open])

  // Debounced, and stale responses are ignored.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    const controller = new AbortController()
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/messages/users/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        const data = res.ok ? await res.json() : []
        setResults(data)
        setActive(0)
      } catch {
        // Aborted or offline.
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 250)
    return () => {
      window.clearTimeout(t)
      controller.abort()
    }
  }, [query])

  function onKeyDown(e: React.KeyboardEvent) {
    if (!results.length) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((a) => (a + 1) % results.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((a) => (a - 1 + results.length) % results.length)
    } else if (e.key === "Enter") {
      e.preventDefault()
      onPick(results[active])
    }
  }

  const q = query.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle>New message</DialogTitle>
          <DialogDescription>Search by name, or enter someone&apos;s exact email.</DialogDescription>
        </DialogHeader>
        <div className="px-5 pb-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Name or email"
              aria-label="Find a member"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="compose-results"
              aria-activedescendant={results[active] ? `compose-${results[active].id}` : undefined}
              className="h-10 pl-9 pr-9"
            />
            {searching && (
              <Loader2
                className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
            )}
          </div>
        </div>
        <div className="max-h-80 min-h-32 overflow-y-auto border-t border-border p-2">
          {results.length > 0 ? (
            <ul id="compose-results" role="listbox" aria-label="Members">
              {results.map((r, i) => (
                <li
                  key={r.id}
                  id={`compose-${r.id}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => onPick(r)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg p-2.5",
                    i === active ? "bg-muted" : "hover:bg-muted/60",
                  )}
                >
                  <UserAvatar firstName={r.firstName} lastName={r.lastName} src={r.profilePicture} className="h-9 w-9" />
                  <span className="font-medium text-foreground">{fullName(r)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground" aria-live="polite">
              {q.length < 2 ? "Start typing to find someone." : searching ? "Searching..." : "No one found."}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
