"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ChevronLeft, Plus, MessageSquare, Eye, Pin, Lock, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useUser } from "@lib/user-context"
import RichTextEditor, { type RichTextEditorRef } from "@/components/forum/rich-text-editor"

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
  }
  _count: { posts: number }
  posts: Array<{
    createdAt: string
    author: { firstName: string; lastName: string }
  }>
}

interface Forum {
  id: string
  name: string
  description: string | null
  category: { id: string; name: string }
}

export default function ForumThreadsContent() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const editorRef = useRef<RichTextEditorRef>(null)
  const [forum, setForum] = useState<Forum | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showNewThread, setShowNewThread] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchThreads()
  }, [params.forumId, page])

  async function fetchThreads() {
    try {
      const res = await fetch(`/api/forum/forums/${params.forumId}?page=${page}`)
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setForum(data.forum)
      setThreads(data.threads)
      setTotalPages(data.pagination.totalPages)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateThread() {
    if(forum.protected && !user.isAdmin) return;
    const content = editorRef.current?.getHTML() || ""
    if (!newTitle.trim() || !content.trim() || content === "<p></p>") return
    setCreating(true)
    try {
      const res = await fetch("/api/forum/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          forumId: params.forumId,
          title: newTitle,
          content,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "Failed to create thread")
        return
      }
      const thread = await res.json()
      setShowNewThread(false)
      setNewTitle("")
      editorRef.current?.clearContent()
      router.push(`/dashboard/forum/${params.forumId}/${thread.slug}`)
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/forum" className="hover:text-foreground">
          Forum
        </Link>
        <span>/</span>
        <span>{forum?.category.name}</span>
        <span>/</span>
        <span className="text-foreground">{forum?.name}</span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/forum">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{forum?.name}</h1>
            {forum?.description && <p className="text-sm text-muted-foreground">{forum.description}</p>}
          </div>
        </div>
        {(!forum.protected || user.isAdmin) && (
          <Dialog open={showNewThread} onOpenChange={setShowNewThread}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Thread
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Thread</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Thread title..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <RichTextEditor
                    ref={editorRef}
                    onChange={setNewContent}
                    placeholder="What would you like to discuss? Use @ to mention users"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button className="cursor-pointer" variant="outline" onClick={() => setShowNewThread(false)}>
                    Cancel
                  </Button>
                  <Button className="cursor-pointer" onClick={handleCreateThread} disabled={creating}>
                    {creating ? "Creating..." : "Create Thread"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">No Threads Yet</h3>
              <p className="mb-4 text-sm text-muted-foreground">Be the first to start a discussion!</p>
              <Button onClick={() => setShowNewThread(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Thread
              </Button>
            </div>
          ) : (
            threads.map((thread) => (
              <Link
                key={thread.id}
                href={`/dashboard/forum/${params.forumId}/${thread.slug}`}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-secondary/50"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={thread.author.profilePicture || undefined} />
                  <AvatarFallback>
                    {thread.author.firstName[0]}
                    {thread.author.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {thread.isSticky && <Pin className="h-4 w-4 text-primary" />}
                    {thread.isClosed && <Lock className="h-4 w-4 text-muted-foreground" />}
                    <h3 className="truncate font-medium">{thread.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Started by {thread.author.firstName} {thread.author.lastName}
                  </p>
                </div>
                <div className="hidden items-center gap-4 text-sm text-muted-foreground md:flex">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    <span>{thread._count.posts}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>{thread.viewCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span className="whitespace-nowrap">
                      {formatDistanceToNow(new Date(thread.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
