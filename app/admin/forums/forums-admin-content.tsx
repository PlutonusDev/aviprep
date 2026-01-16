"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Plus, MoreHorizontal, Pencil, Trash2, FolderPlus, MessageSquare, GripVertical } from "lucide-react"

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
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Forum Management</h1>
          <p className="text-muted-foreground">Create and manage forum categories and forums</p>
        </div>
        <Dialog open={showNewCategory} onOpenChange={setShowNewCategory}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name">Name</Label>
                <Input
                  id="cat-name"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g., General Discussion"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-desc">Description (optional)</Label>
                <Textarea
                  id="cat-desc"
                  value={categoryDesc}
                  onChange={(e) => setCategoryDesc(e.target.value)}
                  placeholder="Brief description..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewCategory(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCategory} disabled={saving}>
                {saving ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">No Categories Yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">Create your first category to get started</p>
            <Button onClick={() => setShowNewCategory(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-5 w-5 cursor-grab text-muted-foreground" />
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setForumName("")
                      setForumDesc("")
                      setShowNewForum(category.id)
                    }}
                  >
                    <FolderPlus className="mr-2 h-4 w-4" />
                    Add Forum
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditCategory(category)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget({ type: "category", id: category.id, name: category.name })}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              {category.description && <p className="px-6 text-sm text-muted-foreground">{category.description}</p>}
              <CardContent className="pt-4">
                {category.forums.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">No forums in this category</p>
                ) : (
                  <div className="space-y-2">
                    {category.forums.map((forum) => (
                      <div
                        key={forum.id}
                        className="flex items-center justify-between rounded-lg border border-border bg-card/50 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
                          <div>
                            <h4 className="font-medium">{forum.name}</h4>
                            {forum.description && <p className="text-sm text-muted-foreground">{forum.description}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">{forum._count.threads} threads</span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditForum(forum, category.id)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget({ type: "forum", id: forum.id, name: forum.name })}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Category Dialog */}
      <Dialog open={!!showEditCategory} onOpenChange={() => setShowEditCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-cat-name">Name</Label>
              <Input id="edit-cat-name" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cat-desc">Description (optional)</Label>
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
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Forum Dialog */}
      <Dialog open={!!showNewForum} onOpenChange={() => setShowNewForum(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Forum</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forum-name">Name</Label>
              <Input
                id="forum-name"
                value={forumName}
                onChange={(e) => setForumName(e.target.value)}
                placeholder="e.g., Navigation Help"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="forum-desc">Description (optional)</Label>
              <Textarea
                id="forum-desc"
                value={forumDesc}
                onChange={(e) => setForumDesc(e.target.value)}
                placeholder="Brief description..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewForum(null)}>
              Cancel
            </Button>
            <Button onClick={handleCreateForum} disabled={saving}>
              {saving ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Forum Dialog */}
      <Dialog open={!!showEditForum} onOpenChange={() => setShowEditForum(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Forum</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-forum-name">Name</Label>
              <Input id="edit-forum-name" value={forumName} onChange={(e) => setForumName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-forum-desc">Description (optional)</Label>
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
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === "category" ? "Category" : "Forum"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"?{" "}
              {deleteTarget?.type === "category"
                ? "This will also delete all forums and threads within it."
                : "This will also delete all threads within it."}
              This action cannot be undone.
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
    </div>
  )
}
