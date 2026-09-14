"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import {
  Eye,
  Flame,
  Heart,
  Link2,
  Lock,
  LockOpen,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Reply,
  Send,
  Shield,
  Sparkles,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, LoadError, PageShell } from "@/components/hub/page-primitives"
import { ForumBreadcrumb, ForumLocked, Pagination, UserAvatar, fullName, timeAgo } from "@/components/forum/forum-ui"
import { RichTextContent } from "@/components/forum/rich-text-content"
import RichTextEditor, { type RichTextEditorRef } from "@/components/forum/rich-text-editor"
import { htmlToText } from "@lib/sanitize-html"
import { useUser } from "@lib/user-context"
import { cn } from "@lib/utils"

const REACTIONS = [
  { type: "thumbsup", icon: ThumbsUp, label: "Helpful" },
  { type: "heart", icon: Heart, label: "Love" },
  { type: "fire", icon: Flame, label: "Fire" },
  { type: "sparkles", icon: Sparkles, label: "Insightful" },
] as const

const PAGE_SIZE = 20

interface Author {
  id: string
  firstName: string
  lastName: string
  profilePicture: string | null
  isAdmin: boolean
  postCount?: number
}

interface Reaction {
  id: string
  type: string
  userId: string
  user: { firstName: string; lastName: string } | null
}

interface Post {
  id: string
  content: string
  isFirstPost: boolean
  deleted?: boolean
  editedAt?: string | null
  createdAt: string
  author: Author | null
  reactions: Reaction[]
  replyTo: { id: string; content: string; author: { id: string; firstName: string; lastName: string } | null } | null
}

interface Thread {
  id: string
  slug: string
  title: string
  isSticky: boolean
  isClosed: boolean
  viewCount: number
  createdAt: string
  forum: { slug: string; name: string; category: { name: string } }
  author: Author | null
}

type Confirm =
  | { kind: "deleteThread" }
  | { kind: "deletePost"; post: Post }
  | { kind: "suspend"; post: Post }

export default function ThreadContent() {
  const params = useParams<{ forumId: string; threadId: string }>()
  const router = useRouter()
  const { user } = useUser()
  const replyEditorRef = useRef<RichTextEditorRef>(null)
  const editEditorRef = useRef<RichTextEditorRef>(null)
  const composerRef = useRef<HTMLDivElement>(null)
  const countedView = useRef(false)
  const usedHash = useRef(false)

  const [thread, setThread] = useState<Thread | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [status, setStatus] = useState<"loading" | "ready" | "locked" | "missing" | "error">("loading")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [scrollTarget, setScrollTarget] = useState<string | null>(null)

  const [replyingTo, setReplyingTo] = useState<Post | null>(null)
  const [posting, setPosting] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const isAdmin = !!user?.isAdmin

  const load = useCallback(
    async (targetPage: number) => {
      try {
        // Only the first load of a visit counts as a view.
        const view = countedView.current ? "&view=0" : ""
        countedView.current = true
        const res = await fetch(`/api/forum/threads/${params.threadId}?page=${targetPage}${view}`)
        if (res.status === 403) return setStatus("locked")
        if (res.status === 404) return setStatus("missing")
        if (!res.ok) throw new Error(String(res.status))
        const data = await res.json()
        setThread(data.thread)
        setPosts(data.posts)
        setTotal(data.pagination.total)
        setStatus("ready")
      } catch {
        setStatus((s) => (s === "ready" ? s : "error"))
      }
    },
    [params.threadId],
  )

  useEffect(() => {
    load(page)
  }, [load, page])

  // Deep links (#post-id) on first render, and scrolling to a post just written.
  useEffect(() => {
    if (status !== "ready") return
    let id = scrollTarget
    if (!id && !usedHash.current) {
      // The URL hash only applies to the first render, not every later update.
      usedHash.current = true
      if (window.location.hash.startsWith("#post-")) id = window.location.hash.slice(6)
    }
    if (!id) return
    const el = document.getElementById(`post-${id}`)
    if (!el) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
    el.focus({ preventScroll: true })
    setScrollTarget(null)
  }, [status, posts, scrollTarget])

  function flash(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice((n) => (n === message ? null : n)), 4000)
  }

  function startReply(post: Post | null) {
    setReplyingTo(post)
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    composerRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" })
    replyEditorRef.current?.focus()
  }

  async function submitReply() {
    setReplyError(null)
    if (replyEditorRef.current?.isEmpty()) return setReplyError("Write something first.")
    setPosting(true)
    try {
      const res = await fetch("/api/forum/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: params.threadId,
          content: replyEditorRef.current?.getHTML(),
          replyToId: replyingTo?.id ?? null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return setReplyError(data.error || "Couldn't post your reply. Try again.")

      replyEditorRef.current?.clearContent()
      setReplyingTo(null)
      // New replies land on the last page; go there and bring the post into view.
      const lastPage = Math.max(1, Math.ceil((total + 1) / PAGE_SIZE))
      setScrollTarget(data.id)
      if (lastPage === page) load(page)
      else setPage(lastPage)
    } catch {
      setReplyError("Couldn't post your reply. Check your connection.")
    } finally {
      setPosting(false)
    }
  }

  async function saveEdit(post: Post) {
    setEditError(null)
    if (editEditorRef.current?.isEmpty()) return setEditError("A post can't be empty.")
    setSaving(true)
    try {
      const content = editEditorRef.current?.getHTML() ?? ""
      const res = await fetch(`/api/forum/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return setEditError(data.error || "Couldn't save. Try again.")
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, content, editedAt: data.editedAt ?? new Date().toISOString() } : p)),
      )
      setEditingId(null)
    } catch {
      setEditError("Couldn't save. Check your connection.")
    } finally {
      setSaving(false)
    }
  }

  async function toggleReaction(post: Post, type: string) {
    if (!user) return
    const mine = post.reactions.find((r) => r.type === type && r.userId === user.id)
    const optimistic = mine
      ? post.reactions.filter((r) => r !== mine)
      : [
          ...post.reactions,
          { id: `temp-${type}`, type, userId: user.id, user: { firstName: user.firstName, lastName: user.lastName } },
        ]
    const previous = post.reactions
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, reactions: optimistic } : p)))
    try {
      const res = await fetch("/api/forum/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, type }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, reactions: previous } : p)))
    }
  }

  async function moderateThread(data: { isSticky?: boolean; isClosed?: boolean }) {
    const res = await fetch(`/api/forum/threads/${params.threadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) return flash("That didn't work. Try again.")
    setThread((t) => (t ? { ...t, ...data } : t))
    flash(
      data.isSticky !== undefined
        ? data.isSticky
          ? "Thread pinned"
          : "Thread unpinned"
        : data.isClosed
          ? "Thread closed"
          : "Thread reopened",
    )
  }

  async function runConfirm() {
    if (!confirm) return
    const c = confirm
    setConfirm(null)
    if (c.kind === "deleteThread") {
      const res = await fetch(`/api/forum/threads/${params.threadId}`, { method: "DELETE" })
      if (!res.ok) return flash("Couldn't delete the thread.")
      router.push(`/dashboard/forum/${thread?.forum.slug ?? params.forumId}`)
    } else if (c.kind === "deletePost") {
      const res = await fetch(`/api/forum/posts/${c.post.id}`, { method: "DELETE" })
      if (!res.ok) return flash("Couldn't delete the post.")
      // Deleting the opening post removes the whole thread.
      if (c.post.isFirstPost) return router.push(`/dashboard/forum/${thread?.forum.slug ?? params.forumId}`)
      load(page)
      flash("Post deleted")
    } else if (c.kind === "suspend" && c.post.author) {
      const res = await fetch(`/api/admin/members/${c.post.author.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSuspendedFromForum: true }),
      })
      flash(res.ok ? `${fullName(c.post.author)} can no longer post` : "Couldn't suspend that member.")
    }
  }

  async function copyLink(post: Post) {
    const url = `${window.location.origin}${window.location.pathname}#post-${post.id}`
    try {
      await navigator.clipboard.writeText(url)
      flash("Link copied")
    } catch {
      flash("Couldn't copy the link")
    }
  }

  if (status === "locked") return <ForumLocked />
  if (status === "missing") {
    return (
      <PageShell>
        <EmptyState icon={MessageSquare} title="Thread not found" description="It may have been removed.">
          <Button asChild variant="outline" className="h-10">
            <Link href={`/dashboard/forum/${params.forumId}`}>Back to forum</Link>
          </Button>
        </EmptyState>
      </PageShell>
    )
  }
  if (status === "error") return <LoadError title="Couldn't load this thread" message="Try again in a moment." />
  if (status === "loading" || !thread) {
    return (
      <PageShell>
        <div className="max-w-4xl space-y-3">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="max-w-4xl space-y-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </PageShell>
    )
  }

  const replies = Math.max(0, total - 1)

  return (
    <PageShell>
      <div className="max-w-4xl space-y-8">
        <header className="space-y-3">
          <ForumBreadcrumb
            items={[
              { label: "Forums", href: "/dashboard/forum" },
              { label: thread.forum.name, href: `/dashboard/forum/${thread.forum.slug}` },
              { label: thread.title },
            ]}
          />

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              {(thread.isSticky || thread.isClosed) && (
                <div className="flex flex-wrap gap-2">
                  {thread.isSticky && (
                    <Badge variant="secondary" className="gap-1 font-normal">
                      <Pin className="h-3 w-3" aria-hidden="true" />
                      Pinned
                    </Badge>
                  )}
                  {thread.isClosed && (
                    <Badge variant="outline" className="gap-1 font-normal text-muted-foreground">
                      <Lock className="h-3 w-3" aria-hidden="true" />
                      Closed
                    </Badge>
                  )}
                </div>
              )}
              <h1 className="text-display-3 font-bold text-balance text-foreground [overflow-wrap:anywhere]">
                {thread.title}
              </h1>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <span>
                  {fullName(thread.author)} &middot; {timeAgo(thread.createdAt)}
                </span>
                <span aria-hidden="true">&middot;</span>
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                  {replies} {replies === 1 ? "reply" : "replies"}
                </span>
                <span aria-hidden="true">&middot;</span>
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  {thread.viewCount} {thread.viewCount === 1 ? "view" : "views"}
                </span>
              </p>
            </div>

            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 shrink-0 gap-1.5">
                    <Shield className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Moderate</span>
                    <span className="sr-only sm:hidden">Moderate thread</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => moderateThread({ isSticky: !thread.isSticky })}>
                    {thread.isSticky ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    {thread.isSticky ? "Unpin" : "Pin to top"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => moderateThread({ isClosed: !thread.isClosed })}>
                    {thread.isClosed ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    {thread.isClosed ? "Reopen" : "Close to replies"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirm({ kind: "deleteThread" })}>
                    <Trash2 className="h-4 w-4" />
                    Delete thread
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>

        {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}

        <ol className="space-y-4">
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard
                post={post}
                isOriginalAuthor={!!thread.author && post.author?.id === thread.author.id}
                currentUserId={user?.id}
                isAdmin={isAdmin}
                threadClosed={thread.isClosed}
                editing={editingId === post.id}
                editEditorRef={editEditorRef}
                saving={saving}
                editError={editingId === post.id ? editError : null}
                onEdit={() => {
                  setEditError(null)
                  setEditingId(post.id)
                }}
                onCancelEdit={() => setEditingId(null)}
                onSaveEdit={() => saveEdit(post)}
                onReply={() => startReply(post)}
                onReact={(type) => toggleReaction(post, type)}
                onCopyLink={() => copyLink(post)}
                onMessage={() => post.author && router.push(`/dashboard/messages?to=${post.author.id}`)}
                onDelete={() => setConfirm({ kind: "deletePost", post })}
                onSuspend={() => setConfirm({ kind: "suspend", post })}
              />
            </li>
          ))}
        </ol>

        <Pagination
          page={page}
          totalPages={totalPages}
          onChange={(p) => {
            setPage(p)
            window.scrollTo({ top: 0 })
          }}
        />

        {thread.isClosed ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-6 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" aria-hidden="true" />
            This thread is closed to new replies.
          </div>
        ) : (
          <section aria-labelledby="reply-heading" ref={composerRef} className="scroll-mt-24">
            <Card className="shadow-e1">
              <CardContent className="p-4 sm:p-5">
                <div className="mb-3 flex items-center gap-3">
                  <UserAvatar firstName={user?.firstName} lastName={user?.lastName} src={user?.profilePicture} className="h-8 w-8" />
                  <h2 id="reply-heading" className="font-semibold text-foreground">
                    Reply
                  </h2>
                  {replyingTo && (
                    <span className="flex min-w-0 items-center gap-1 rounded-full bg-muted py-0.5 pl-2.5 pr-1 text-xs text-muted-foreground">
                      <Reply className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">to {fullName(replyingTo.author)}</span>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        aria-label="Stop replying to this post"
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </span>
                  )}
                </div>

                <div
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      submitReply()
                    }
                  }}
                >
                  <RichTextEditor ref={replyEditorRef} label="Your reply" placeholder="Write a reply" />
                </div>

                {replyError && (
                  <p role="alert" className="mt-2 text-sm text-destructive">
                    {replyError}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-end gap-3">
                  <span className="hidden text-xs text-muted-foreground sm:inline">Ctrl + Enter to post</span>
                  <Button onClick={submitReply} disabled={posting} className="h-10 gap-2">
                    <Send className="h-4 w-4" aria-hidden="true" />
                    {posting ? "Posting..." : "Post reply"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </div>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
        {notice && (
          <p className="rounded-full border border-border bg-popover px-4 py-2 text-sm text-foreground shadow-e3">{notice}</p>
        )}
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "deleteThread" || (confirm?.kind === "deletePost" && confirm.post.isFirstPost)
                ? "Delete this thread?"
                : confirm?.kind === "deletePost"
                  ? "Delete this post?"
                  : `Suspend ${confirm?.kind === "suspend" ? fullName(confirm.post.author) : ""}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "suspend"
                ? "They'll still be able to read the forums, but not post."
                : confirm?.kind === "deletePost" && !confirm.post.isFirstPost
                  ? "The post is replaced with a deleted notice."
                  : "The thread and all its replies will be removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={runConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {confirm?.kind === "suspend" ? "Suspend" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  )
}

/* --- Post ------------------------------------------------------------------ */

function PostCard({
  post,
  isOriginalAuthor,
  currentUserId,
  isAdmin,
  threadClosed,
  editing,
  editEditorRef,
  saving,
  editError,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onReply,
  onReact,
  onCopyLink,
  onMessage,
  onDelete,
  onSuspend,
}: {
  post: Post
  isOriginalAuthor: boolean
  currentUserId?: string
  isAdmin: boolean
  threadClosed: boolean
  editing: boolean
  editEditorRef: React.RefObject<RichTextEditorRef | null>
  saving: boolean
  editError: string | null
  onEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onReply: () => void
  onReact: (type: string) => void
  onCopyLink: () => void
  onMessage: () => void
  onDelete: () => void
  onSuspend: () => void
}) {
  const author = post.author
  const isMine = !!currentUserId && author?.id === currentUserId
  const quote = useMemo(() => (post.replyTo ? htmlToText(post.replyTo.content).slice(0, 160) : ""), [post.replyTo])
  const created = new Date(post.createdAt)

  return (
    <article
      id={`post-${post.id}`}
      tabIndex={-1}
      aria-label={`Post by ${fullName(author)}`}
      className={cn(
        "scroll-mt-24 rounded-xl border bg-card shadow-e1 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring target:ring-2 target:ring-primary/50",
        post.isFirstPost ? "border-primary/30" : "border-border",
      )}
    >
      <header className="flex items-start gap-3 px-4 pt-4 sm:px-5">
        <UserAvatar
          firstName={author?.firstName}
          lastName={author?.lastName}
          src={author?.profilePicture}
          className="h-10 w-10 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-foreground">{fullName(author)}</span>
            {author?.isAdmin && (
              <Badge className="h-5 gap-1 px-1.5 text-[11px] font-medium">
                <Shield className="h-3 w-3" aria-hidden="true" />
                Moderator
              </Badge>
            )}
            {isOriginalAuthor && !post.isFirstPost && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[11px] font-normal">
                Author
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            <a
              href={`#post-${post.id}`}
              className="hover:text-foreground hover:underline"
              title={format(created, "d MMM yyyy, h:mm a")}
            >
              <time dateTime={created.toISOString()}>{timeAgo(created)}</time>
            </a>
            {post.editedAt && !post.deleted && (
              <span title={format(new Date(post.editedAt), "d MMM yyyy, h:mm a")}> &middot; edited</span>
            )}
            {typeof author?.postCount === "number" && (
              <span className="hidden sm:inline">
                {" "}
                &middot; {author.postCount} {author.postCount === 1 ? "post" : "posts"}
              </span>
            )}
          </p>
        </div>

        {!post.deleted && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="-mr-2 h-9 w-9 text-muted-foreground" aria-label="Post options">
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onCopyLink}>
                <Link2 className="h-4 w-4" />
                Copy link
              </DropdownMenuItem>
              {isMine && (
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {isAdmin && !isMine && author && (
                <DropdownMenuItem onClick={onMessage}>
                  <Mail className="h-4 w-4" />
                  Message {author.firstName}
                </DropdownMenuItem>
              )}
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  {!isMine && author && (
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onSuspend}>
                      <Shield className="h-4 w-4" />
                      Suspend from posting
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
                    <Trash2 className="h-4 w-4" />
                    {post.isFirstPost ? "Delete thread" : "Delete post"}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      <div className="px-4 pb-4 pt-3 sm:px-5 sm:pl-[4.25rem]">
        {post.replyTo && !post.deleted && (
          <a
            href={`#post-${post.replyTo.id}`}
            className="mb-3 block rounded-lg border-l-2 border-primary/40 bg-muted/50 px-3 py-2 text-sm transition-colors hover:bg-muted"
          >
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Reply className="h-3 w-3" aria-hidden="true" />
              {fullName(post.replyTo.author)}
            </span>
            <span className="mt-0.5 line-clamp-2 text-muted-foreground">{quote || "…"}</span>
          </a>
        )}

        {post.deleted ? (
          <p className="text-sm italic text-muted-foreground">This post was deleted.</p>
        ) : editing ? (
          <div className="space-y-3">
            <RichTextEditor ref={editEditorRef} content={post.content} label="Edit post" autoFocus />
            {editError && (
              <p role="alert" className="text-sm text-destructive">
                {editError}
              </p>
            )}
            <div className="flex gap-2">
              <Button size="sm" className="h-9" onClick={onSaveEdit} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" variant="ghost" className="h-9" onClick={onCancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <RichTextContent html={post.content} />
        )}

        {!post.deleted && !editing && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {REACTIONS.map(({ type, icon: Icon, label }) => {
              const matching = post.reactions.filter((r) => r.type === type)
              const mine = matching.some((r) => r.userId === currentUserId)
              const who = matching.map((r) => fullName(r.user)).slice(0, 10).join(", ")
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={mine}
                  aria-label={`${label}${matching.length ? `, ${matching.length}` : ""}`}
                  title={who ? `${label}: ${who}` : label}
                  onClick={() => onReact(type)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    mine
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : matching.length
                        ? "border-border text-foreground hover:bg-muted"
                        : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", mine && "fill-current")} aria-hidden="true" />
                  {matching.length > 0 && <span data-tabular>{matching.length}</span>}
                </button>
              )
            })}

            {!threadClosed && (
              <Button variant="ghost" size="sm" className="ml-auto h-8 gap-1.5 text-muted-foreground" onClick={onReply}>
                <Reply className="h-3.5 w-3.5" aria-hidden="true" />
                Reply
              </Button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
