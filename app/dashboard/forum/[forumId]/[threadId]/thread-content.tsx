"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  ChevronLeft,
  Pin,
  Lock,
  MoreHorizontal,
  Trash2,
  Shield,
  Heart,
  ThumbsUp,
  Flame,
  Sparkles,
  Send,
  Mail,
  Reply,
  Pencil,
  X,
  MoreVertical,
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { useUser } from "@lib/user-context"
import RichTextEditor, { type RichTextEditorRef } from "@/components/forum/rich-text-editor"
import { FaFire, FaGem, FaHeart, FaThumbsUp } from "react-icons/fa6"

const REACTIONS = [
  { type: "heart", icon: Heart, Emoji: FaHeart },
  { type: "thumbsup", icon: ThumbsUp, Emoji: FaThumbsUp },
  { type: "fire", icon: Flame, Emoji: FaFire },
  { type: "sparkles", icon: Sparkles, Emoji: FaGem },
]

interface Reaction {
  id: string
  type: string
  userId: string
  user: { firstName: string; lastName: string }
}

interface ReplyTo {
  id: string
  content: string
  author: {
    id: string
    firstName: string
    lastName: string
  }
}

interface Post {
  deleted: any
  editedAt: any
  id: string
  content: string
  isFirstPost: boolean
  createdAt: string
  updatedAt: string
  author: {
    id: string
    firstName: string
    lastName: string
    profilePicture: string | null
    isAdmin: boolean
    createdAt: string
    postCount: number
  }
  reactions: Reaction[]
  replyTo: ReplyTo | null
}

interface Thread {
  id: string
  title: string
  isSticky: boolean
  isClosed: boolean
  viewCount: number
  forum: {
    slug: any
    id: string
    name: string
    category: { id: string; name: string }
  }
  author: {
    id: string
    firstName: string
    lastName: string
    isAdmin: boolean
  }
}

export default function ThreadContent() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const editorRef = useRef<RichTextEditorRef>(null)
  const editEditorRef = useRef<RichTextEditorRef>(null)
  const [thread, setThread] = useState<Thread | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [replyContent, setReplyContent] = useState("")
  const [posting, setPosting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Post | null>(null)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [editContent, setEditContent] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchThread()
  }, [params.threadId, page])

  useEffect(() => {
    if (editingPost && editEditorRef.current) {
      editEditorRef.current.setContent(editingPost.content)
    }
  }, [editingPost])

  async function fetchThread() {
    try {
      const res = await fetch(`/api/forum/threads/${params.threadId}?page=${page}`)
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setThread(data.thread)
      setPosts(data.posts)
      setTotalPages(data.pagination.totalPages)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleReply() {
    const content = editorRef.current?.getHTML() || ""
    if (!content.trim() || content === "<p></p>") return
    setPosting(true)
    try {
      const res = await fetch("/api/forum/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: params.threadId,
          content,
          replyToId: replyingTo?.id || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "Failed to post reply")
        return
      }
      editorRef.current?.clearContent()
      setReplyingTo(null)
      fetchThread()
    } catch (err) {
      console.error(err)
    } finally {
      setPosting(false)
    }
  }

  async function handleEditPost() {
    if (!editingPost) return
    const content = editEditorRef.current?.getHTML() || ""
    if (!content.trim() || content === "<p></p>") return
    setSaving(true)
    try {
      const res = await fetch(`/api/forum/posts/${editingPost.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "Failed to edit post")
        return
      }
      setEditingPost(null)
      fetchThread()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleReaction(postId: string, type: string) {
    try {
      await fetch("/api/forum/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, type }),
      })
      fetchThread()
    } catch (err) {
      console.error(err)
    }
  }

  async function handleAdminAction(action: string, id: string, data?: Record<string, unknown>) {
    try {
      if (action === "sticky" || action === "close") {
        await fetch(`/api/forum/threads/${params.threadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
      } else if (action === "deleteThread") {
        await fetch(`/api/forum/threads/${params.threadId}`, { method: "DELETE" })
        router.push(`/dashboard/forum/${params.forumId}`)
        return
      } else if (action === "deletePost") {
        await fetch(`/api/forum/posts/${id}`, { method: "DELETE" })
      } else if (action === "suspendUser") {
        await fetch(`/api/admin/members/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isSuspendedFromForum: true }),
        })
      }
      fetchThread()
    } catch (err) {
      console.error(err)
    }
  }

  function scrollToPost(postId: string) {
    const element = document.getElementById(`post-${postId}`)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" })
      element.classList.add("ring-2", "ring-primary")
      setTimeout(() => element.classList.remove("ring-2", "ring-primary"), 2000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!thread) {
    return <div>Thread not found</div>
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/forum" className="hover:text-foreground">
          Forum
        </Link>
        <span>/</span>
        <span className="text-muted-foreground">{thread.forum.category.name}</span>
        <span>/</span>
        <Link href={`/dashboard/forum/${thread.forum.slug}`} className="hover:text-foreground">
          {thread.forum.name}
        </Link>
        <span>/</span>
        <span className="truncate text-foreground">{thread.title}</span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/forum/${thread.forum.id}`}>
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            {thread.isSticky && <Pin className="h-4 w-4 text-primary" />}
            {thread.isClosed && <Lock className="h-4 w-4 text-muted-foreground" />}
            <h1 className="text-xl font-bold">{thread.title}</h1>
          </div>
        </div>
        {user?.isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="cursor-pointer">
                <Shield className="mr-2 h-4 w-4" />
                Admin Tools
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="cursor-pointer" onClick={() => handleAdminAction("sticky", "", { isSticky: !thread.isSticky })}>
                <Pin className="mr-2 h-4 w-4" />
                {thread.isSticky ? "Unpin Thread" : "Pin Thread"}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => handleAdminAction("close", "", { isClosed: !thread.isClosed })}>
                <Lock className="mr-2 h-4 w-4" />
                {thread.isClosed ? "Reopen Thread" : "Close Thread"}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-red-500" onClick={() => handleAdminAction("deleteThread", "")}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Thread
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id} id={`post-${post.id}`} className="transition-all">
            <CardContent className="p-4">
              <div className="grid grid-cols-14 flex justify-center">
                <div className="col-span-2 hidden flex-col items-center gap-2 sm:flex">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={post.author.profilePicture || undefined} />
                    <AvatarFallback>
                      {post.author.firstName[0]}
                      {post.author.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <p className={`text-sm font-medium ${post.author.isAdmin ? "text-primary" : ""}`}>
                      {post.author.firstName} {post.author.lastName}
                    </p>
                    {post.author.isAdmin && (
                      <Badge className="bg-primary text-xs mt-2">
                        Admin
                      </Badge>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{post.author.postCount} posts</p>
                  </div>
                </div>
                <div className="col-span-12 min-w-0">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:hidden">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={post.author.profilePicture || undefined} />
                        <AvatarFallback>
                          {post.author.firstName[0]}
                          {post.author.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className={`text-sm font-medium ${post.author.isAdmin ? "text-primary" : ""}`}>
                        {post.author.firstName} {post.author.lastName}
                      </span>
                    </div>
                    <div className="flex w-full justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(post.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                        {post.editedAt && (
                          <span
                            className="text-xs text-muted-foreground italic"
                            title={format(new Date(post.editedAt), "MMM d, yyyy 'at' h:mm a")}
                          >
                            (edited {formatDistanceToNow(new Date(post.editedAt), { addSuffix: true })})
                          </span>
                        )}
                      </div>
                      {((user?.isAdmin || user?.id === post.author.id) && !post.deleted) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="cursor-pointer h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {user?.id === post.author.id && (
                              <DropdownMenuItem className="cursor-pointer" onClick={() => setEditingPost(post)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit Post
                              </DropdownMenuItem>
                            )}
                            {user?.isAdmin && user?.id !== post.author.id && (
                              <>
                                <DropdownMenuItem className="cursor-pointer"
                                  onClick={() => router.push(`/dashboard/messages?to=${post.author.id}`)}
                                >
                                  <Mail className="mr-2 h-4 w-4" />
                                  Message User
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleAdminAction("suspendUser", post.author.id)}
                                  className="text-red-500 cursor-pointer"
                                >
                                  <Shield className="mr-2 h-4 w-4" />
                                  Suspend User
                                </DropdownMenuItem>
                              </>
                            )}
                            {user?.isAdmin && (
                              <DropdownMenuItem
                                onClick={() => handleAdminAction("deletePost", post.id)}
                                className="cursor-pointer text-red-500"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Post
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  {editingPost?.id === post.id ? (
                    <div className="space-y-3">
                      <RichTextEditor
                        ref={editEditorRef}
                        content={post.content}
                        onChange={setEditContent}
                        placeholder="Edit your post..."
                      />
                      <div className="flex items-center gap-2">
                        <Button className="cursor-pointer" onClick={handleEditPost} disabled={saving} size="sm">
                          {saving ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button className="cursor-pointer" variant="outline" size="sm" onClick={() => setEditingPost(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col justify-between h-full">
                      {/* Rich text content */}
                      <div>
                        {post.replyTo && (
                          <button
                            onClick={() => scrollToPost(post.replyTo!.id)}
                            className="cursor-pointer flex items-start gap-2 rounded-md bg-secondary/50 p-2 text-left text-sm transition-colors hover:bg-secondary"
                          >
                            <Reply className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <span>Replied to </span>
                              <span className="font-medium text-primary">
                                @{post.replyTo.author.firstName} {post.replyTo.author.lastName}
                              </span>
                              <p
                                className="line-clamp-1 text-muted-foreground"
                                dangerouslySetInnerHTML={{
                                  __html: post.replyTo.content.replace(/<[^>]*>/g, " ").slice(0, 100),
                                }}
                              />
                            </div>
                          </button>
                        )}
                        <div
                          className="prose prose-sm prose-invert max-w-none [&_a]:text-primary [&_a]:underline [&_img]:rounded-lg [&_img]:max-w-full"
                          dangerouslySetInnerHTML={{ __html: post.content }}
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-4 -translate-y-8">
                        {REACTIONS.map(({ type, Emoji }) => {
                          const count = post.reactions.filter((r) => r.type === type).length
                          const hasReacted = post.reactions.some((r) => r.type === type && r.userId === user?.id)
                          return (
                            <Button
                              key={type}
                              className={`h-8 px-3 flex items-center text-foreground cursor-pointer ${hasReacted ? "bg-primary" : "bg-background"}`}
                              onClick={() => handleReaction(post.id, type)}
                            >
                              <Emoji />
                              {count > 0 && <span className="font-medium">{count}</span>}
                            </Button>
                          )
                        })}
                        {(!thread.isClosed && !post.deleted) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="cursor-pointer ml-auto h-8 gap-1"
                            onClick={() => setReplyingTo(post)}
                          >
                            <Reply className="h-4 w-4" />
                            Reply
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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

      {!thread.isClosed && (
        <Card>
          <CardContent className="p-4">
            {replyingTo && (
              <div className="mb-3 flex items-center justify-between rounded-md bg-secondary/50 p-2">
                <div className="flex items-center gap-2 text-sm">
                  <Reply className="h-4 w-4 text-muted-foreground" />
                  <span>Replying to</span>
                  <span className="font-medium text-primary">
                    {replyingTo.author.firstName} {replyingTo.author.lastName}
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyingTo(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <h3 className="mb-2 font-medium">{replyingTo ? "Write your reply" : "Reply to Thread"}</h3>
            <RichTextEditor
              ref={editorRef}
              onChange={setReplyContent}
              placeholder="Write your reply... Use @ to mention users"
              className="mb-3"
            />
            <Button onClick={handleReply} className="cursor-pointer" disabled={posting}>
              <Send className="mr-2 h-4 w-4" />
              {posting ? "Posting..." : "Post Reply"}
            </Button>
          </CardContent>
        </Card>
      )}

      {thread.isClosed && (
        <Card className="border-muted">
          <CardContent className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span>This thread is closed and cannot receive new replies.</span>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
