"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, Lock, MessageSquare, MessagesSquare, Pin, Plus, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, LoadError, PageHeader, PageShell } from "@/components/hub/page-primitives"
import { ForumBreadcrumb, ForumLocked, Pagination, UserAvatar, fullName, timeAgo } from "@/components/forum/forum-ui"
import RichTextEditor, { type RichTextEditorRef } from "@/components/forum/rich-text-editor"
import { useUser } from "@lib/user-context"
import { cn } from "@lib/utils"
import { CuratorBadge } from "@/components/forum/curator-badge"

interface Thread {
  id: string
  title: string
  slug: string
  isSticky: boolean
  isClosed: boolean
  viewCount: number
  createdAt: string
  updatedAt: string
  author: {
    id: string
    firstName: string
    lastName: string
    profilePicture: string | null
    isCurator?: boolean | null
    curatorCredential?: string | null
  } | null
  _count: { posts: number }
  posts: Array<{ createdAt: string; author: { firstName: string; lastName: string } | null }>
}

interface Forum {
  id: string
  name: string
  slug: string
  description: string | null
  category: { id: string; name: string }
  protected: boolean
}

const TITLE_MAX = 150

export default function ForumThreadsContent() {
  const params = useParams<{ forumId: string }>()
  const router = useRouter()
  const { user } = useUser()
  const editorRef = useRef<RichTextEditorRef>(null)

  const [forum, setForum] = useState<Forum | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  const [status, setStatus] = useState<"loading" | "ready" | "locked" | "missing" | "error">("loading")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [composerOpen, setComposerOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/forum/forums/${params.forumId}?page=${page}`)
      if (res.status === 403) return setStatus("locked")
      if (res.status === 404) return setStatus("missing")
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      setForum(data.forum)
      setThreads(data.threads)
      setTotalPages(Math.max(1, data.pagination.totalPages))
      setStatus("ready")
    } catch {
      setStatus("error")
    }
  }, [params.forumId, page])

  useEffect(() => {
    load()
  }, [load])

  const canPost = !!forum && (!forum.protected || !!user?.isAdmin)

  async function createThread() {
    setCreateError(null)
    if (!title.trim()) return setCreateError("Give your thread a title.")
    if (editorRef.current?.isEmpty()) return setCreateError("Write something to start the thread.")

    setCreating(true)
    try {
      const res = await fetch("/api/forum/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forumId: params.forumId, title: title.trim(), content: editorRef.current?.getHTML() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return setCreateError(data.error || "Couldn't post that. Try again.")
      setComposerOpen(false)
      setTitle("")
      router.push(`/dashboard/forum/${params.forumId}/${data.slug}`)
    } catch {
      setCreateError("Couldn't post that. Check your connection.")
    } finally {
      setCreating(false)
    }
  }

  if (status === "locked") return <ForumLocked />
  if (status === "missing") {
    return (
      <PageShell>
        <EmptyState icon={MessagesSquare} title="Forum not found" description="It may have been moved or removed.">
          <Button asChild variant="outline" className="h-10">
            <Link href="/dashboard/forum">All forums</Link>
          </Button>
        </EmptyState>
      </PageShell>
    )
  }
  if (status === "error") return <LoadError title="Couldn't load this forum" message="Try again in a moment." />

  if (status === "loading" || !forum) {
    return (
      <PageShell>
        <div className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-72" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </PageShell>
    )
  }

  const pinned = threads.filter((t) => t.isSticky)
  const rest = threads.filter((t) => !t.isSticky)

  return (
    <PageShell>
      <div className="space-y-3">
        <ForumBreadcrumb
          items={[{ label: "Forums", href: "/dashboard/forum" }, { label: forum.category.name }, { label: forum.name }]}
        />
        <PageHeader title={forum.name} description={forum.description ?? undefined}>
          {canPost && (
            <Button size="lg" className="h-11 shrink-0 gap-2" onClick={() => setComposerOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New thread
            </Button>
          )}
        </PageHeader>
        {forum.protected && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Only moderators can start threads here.
          </p>
        )}
      </div>

      {threads.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No threads yet" description="Be the first to start one.">
          {canPost && (
            <Button className="h-10 gap-2" onClick={() => setComposerOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New thread
            </Button>
          )}
        </EmptyState>
      ) : (
        <Card className="overflow-hidden shadow-e1">
          <CardContent className="p-0">
            {/* Column labels for wide screens; rows carry their own labels below that. */}
            <div
              className="hidden items-center gap-4 border-b border-border bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground md:flex"
              aria-hidden="true"
            >
              <span className="flex-1 pl-13">Thread</span>
              <span className="w-24 text-right">Replies</span>
              <span className="w-44">Last reply</span>
            </div>
            <ul className="divide-y divide-border">
              {[...pinned, ...rest].map((thread) => (
                <ThreadRow key={thread.id} thread={thread} forumSlug={forum.slug} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        onChange={(p) => {
          setPage(p)
          window.scrollTo({ top: 0 })
        }}
      />

      <Dialog
        open={composerOpen}
        onOpenChange={(open) => {
          setComposerOpen(open)
          if (!open) setCreateError(null)
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New thread</DialogTitle>
            <DialogDescription>in {forum.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="thread-title">Title</Label>
                <span
                  className={cn("text-xs text-muted-foreground", title.length > TITLE_MAX - 20 && "text-foreground")}
                  data-tabular
                >
                  {title.length}/{TITLE_MAX}
                </span>
              </div>
              <Input
                id="thread-title"
                value={title}
                maxLength={TITLE_MAX}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Post</p>
              <RichTextEditor ref={editorRef} label="Post" placeholder="What do you want to discuss?" />
            </div>
            {createError && (
              <p role="alert" className="text-sm text-destructive">
                {createError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createThread} disabled={creating}>
              {creating ? "Posting..." : "Post thread"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}

function ThreadRow({ thread, forumSlug }: { thread: Thread; forumSlug: string }) {
  // The first post is the thread itself, so it isn't a reply.
  const replies = Math.max(0, thread._count.posts - 1)
  const last = thread.posts[0]
  const hasReplies = replies > 0 && last

  return (
    <li
      className={cn(
        "group relative flex items-center gap-4 p-4 transition-colors hover:bg-muted/40 has-[a:focus-visible]:bg-muted/40 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-inset has-[a:focus-visible]:ring-ring",
        thread.isSticky && "bg-primary/[0.03]",
      )}
    >
      <UserAvatar
        firstName={thread.author?.firstName}
        lastName={thread.author?.lastName}
        src={thread.author?.profilePicture}
        className="h-9 w-9 shrink-0"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {thread.isSticky && (
            <Badge variant="secondary" className="gap-1 px-1.5 text-xs font-normal">
              <Pin className="h-3 w-3" aria-hidden="true" />
              Pinned
            </Badge>
          )}
          {thread.isClosed && (
            <Badge variant="outline" className="gap-1 px-1.5 text-xs font-normal text-muted-foreground">
              <Lock className="h-3 w-3" aria-hidden="true" />
              Closed
            </Badge>
          )}
          <Link
            href={`/dashboard/forum/${forumSlug}/${thread.slug}`}
            className="min-w-0 font-medium text-foreground after:absolute after:inset-0 focus-visible:outline-none"
          >
            {thread.title}
          </Link>
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
          <span>{fullName(thread.author)}</span>
          <CuratorBadge isCurator={thread.author?.isCurator} credential={thread.author?.curatorCredential} />
          <span aria-hidden="true">&middot;</span>
          <span>{timeAgo(thread.createdAt)}</span>
          {/* Counts inline on small screens, in columns from md up. */}
          <span className="inline-flex items-center gap-x-1.5 md:hidden">
            <span aria-hidden="true">&middot;</span>
            {replies} {replies === 1 ? "reply" : "replies"}
          </span>
        </p>
      </div>

      <div className="hidden w-24 shrink-0 text-right md:block">
        <p className="font-semibold text-foreground" data-tabular>
          {replies}
          <span className="sr-only"> {replies === 1 ? "reply" : "replies"}</span>
        </p>
        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground" data-tabular>
          <Eye className="h-3 w-3" aria-hidden="true" />
          {thread.viewCount}
          <span className="sr-only"> views</span>
        </p>
      </div>

      <div className="hidden w-44 shrink-0 md:block">
        {hasReplies ? (
          <>
            <p className="truncate text-sm text-foreground">{fullName(last.author)}</p>
            <p className="text-xs text-muted-foreground">{timeAgo(last.createdAt)}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No replies</p>
        )}
      </div>
    </li>
  )
}
