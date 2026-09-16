"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
import { Plus, MoreHorizontal, Pencil, Trash2, FolderPlus, MessageSquare } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, PageHeader, PageShell } from "@/components/hub/page-primitives"

interface Forum {
  id: string
  name: string
  description: string | null
  slug: string
  order: number
  _count: { threads: number }
}

interface Category {
  id: string
  name: string
  description: string | null
  slug: string
  order: number
  forums: Forum[]
}

export default function ForumsAdminContent() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog states
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [showEditCategory, setShowEditCategory] = useState<Category | null>(null)
  const [showNewForum, setShowNewForum] = useState<string | null>(null)
  const [showEditForum, setShowEditForum] = useState<(Forum & { categoryId: string }) | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ type: "category" | "forum"; id: string; name: string } | null>(
    null,
  )

  // Form states
  const [categoryName, setCategoryName] = useState("")
  const [categoryDesc, setCategoryDesc] = useState("")
  const [forumName, setForumName] = useState("")
  const [forumDesc, setForumDesc] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  async function fetchCategories() {
    try {
      const res = await fetch("/api/admin/forums/categories")
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setCategories(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateCategory() {
    if (!categoryName.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/forums/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryName, description: categoryDesc }),
      })
      if (!res.ok) throw new Error("Failed to create")
      setShowNewCategory(false)
      setCategoryName("")
      setCategoryDesc("")
      fetchCategories()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdateCategory() {
    if (!showEditCategory || !categoryName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/forums/categories/${showEditCategory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryName, description: categoryDesc }),
      })
      if (!res.ok) throw new Error("Failed to update")
      setShowEditCategory(null)
      setCategoryName("")
      setCategoryDesc("")
      fetchCategories()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateForum() {
    if (!showNewForum || !forumName.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/forums/forums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: showNewForum,
          name: forumName,
          description: forumDesc,
        }),
      })
      if (!res.ok) throw new Error("Failed to create")
      setShowNewForum(null)
      setForumName("")
      setForumDesc("")
      fetchCategories()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdateForum() {
    if (!showEditForum || !forumName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/forums/forums/${showEditForum.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: forumName, description: forumDesc }),
      })
      if (!res.ok) throw new Error("Failed to update")
      setShowEditForum(null)
      setForumName("")
      setForumDesc("")
      fetchCategories()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const endpoint =
        deleteTarget.type === "category"
          ? `/api/admin/forums/categories/${deleteTarget.id}`
          : `/api/admin/forums/forums/${deleteTarget.id}`
      const res = await fetch(endpoint, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setDeleteTarget(null)
      fetchCategories()
    } catch (err) {
      console.error(err)
    }
  }

  function openEditCategory(category: Category) {
    setCategoryName(category.name)
    setCategoryDesc(category.description || "")
    setShowEditCategory(category)
  }

  function openEditForum(forum: Forum, categoryId: string) {
    setForumName(forum.name)
    setForumDesc(forum.description || "")
    setShowEditForum({ ...forum, categoryId })
  }

  if (loading) {
    return (
      <PageShell>
        <div className="space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </PageShell>
    )
  }

  const forumCount = categories.reduce((n, c) => n + c.forums.length, 0)
  const threadCount = categories.reduce((n, c) => n + c.forums.reduce((a, f) => a + f._count.threads, 0), 0)

  return (
    <PageShell>
      <PageHeader
        title="Forums"
        description={`${categories.length} categor${categories.length === 1 ? "y" : "ies"} · ${forumCount} forum${forumCount === 1 ? "" : "s"} · ${threadCount.toLocaleString()} thread${threadCount === 1 ? "" : "s"}`}
      >
        <Dialog open={showNewCategory} onOpenChange={setShowNewCategory}>
          <DialogTrigger asChild>
            <Button className="h-10 gap-2 self-start">
              <Plus className="h-4 w-4" aria-hidden="true" />
              New category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name">Name</Label>
                <Input
                  id="cat-name"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. General"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-desc">Description</Label>
                <Textarea
                  id="cat-desc"
                  value={categoryDesc}
                  onChange={(e) => setCategoryDesc(e.target.value)}
                  placeholder="Optional"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewCategory(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCategory} disabled={saving}>
                {saving ? "Creating" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {categories.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No categories yet" description="Categories group related forums.">
          <Button onClick={() => setShowNewCategory(true)} className="h-10 gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New category
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => (
            <section key={category.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-e1" aria-label={category.name}>
              <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground">{category.name}</h2>
                  {category.description && <p className="mt-0.5 text-sm text-muted-foreground">{category.description}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => {
                      setForumName("")
                      setForumDesc("")
                      setShowNewForum(category.id)
                    }}
                  >
                    <FolderPlus className="h-3.5 w-3.5" aria-hidden="true" />
                    Add forum
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${category.name}`}>
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditCategory(category)}>
                        <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget({ type: "category", id: category.id, name: category.name })}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </header>
              {category.forums.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">No forums yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {category.forums.map((forum) => (
                    <li key={forum.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{forum.name}</p>
                        {forum.description && <p className="truncate text-sm text-muted-foreground">{forum.description}</p>}
                      </div>
                      <span className="shrink-0 text-sm text-muted-foreground" data-tabular>
                        {forum._count.threads} thread{forum._count.threads === 1 ? "" : "s"}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Actions for ${forum.name}`}>
                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditForum(forum, category.id)}>
                            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget({ type: "forum", id: forum.id, name: forum.name })}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {/* Edit Category Dialog */}
      <Dialog open={!!showEditCategory} onOpenChange={() => setShowEditCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-cat-name">Name</Label>
              <Input id="edit-cat-name" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cat-desc">Description</Label>
              <Textarea
                id="edit-cat-desc"
                value={categoryDesc}
                onChange={(e) => setCategoryDesc(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditCategory(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCategory} disabled={saving}>
              {saving ? "Saving" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Forum Dialog */}
      <Dialog open={!!showNewForum} onOpenChange={() => setShowNewForum(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New forum</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forum-name">Name</Label>
              <Input
                id="forum-name"
                value={forumName}
                onChange={(e) => setForumName(e.target.value)}
                placeholder="e.g. Navigation"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="forum-desc">Description</Label>
              <Textarea
                id="forum-desc"
                value={forumDesc}
                onChange={(e) => setForumDesc(e.target.value)}
                placeholder="Optional"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewForum(null)}>
              Cancel
            </Button>
            <Button onClick={handleCreateForum} disabled={saving}>
              {saving ? "Creating" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Forum Dialog */}
      <Dialog open={!!showEditForum} onOpenChange={() => setShowEditForum(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit forum</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-forum-name">Name</Label>
              <Input id="edit-forum-name" value={forumName} onChange={(e) => setForumName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-forum-desc">Description</Label>
              <Textarea
                id="edit-forum-desc"
                value={forumDesc}
                onChange={(e) => setForumDesc(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditForum(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateForum} disabled={saving}>
              {saving ? "Saving" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "category" ? "Its forums and threads go too." : "Its threads go too."} This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  )
}
