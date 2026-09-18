"use client"

import Link from "next/link"
import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  FileText,
  HelpCircle,
  Layers,
  GripVertical,
  ImageIcon,
  ListChecks,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { toast } from "sonner"
import { use } from "react"
import { useUser } from "@lib/user-context"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, PageHeader, PageShell } from "@/components/hub/page-primitives"
import { ReviewActivity } from "@/components/review/review-activity"
import { cn } from "@lib/utils"
import { useStudioActivity } from "@/components/curators/presence-beacon"
import { CourseSubmit } from "@/components/admin/course-submit"

interface Lesson {
  id: string
  title: string
  description?: string
  contentType: string
  estimatedMins: number
  order: number
}

interface Module {
  id: string
  title: string
  description?: string
  order: number
  lessons: Lesson[]
}

interface Course {
  id: string
  title: string
  description: string
  subjectId: string
  isPublished: boolean
  /** null | "review" | "changes" | "rejected". Unpublished courses only. */
  reviewStatus?: string | null
  rejectionReason?: string | null
  modules: Module[]
}

const contentTypeIcons: Record<string, any> = {
  text: FileText,
  media: ImageIcon,
  quiz: HelpCircle,
  exercise: ListChecks,
  flashcards: Layers,
}

export default function CourseEditorPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params)
  const { user } = useUser()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [openModules, setOpenModules] = useState<string[]>([])
  const [reordering, setReordering] = useState(false)
  /** Lessons without a primary Part 61 MOS item - they block publishing. */
  const [mosUnmapped, setMosUnmapped] = useState<string[]>([])
  /** Curators: whether they've written anything in this course. */
  const [canSubmit, setCanSubmit] = useState(false)

  // Module dialog
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false)
  const [editingModule, setEditingModule] = useState<Module | null>(null)
  const [moduleForm, setModuleForm] = useState({ title: "", description: "" })

  // Lesson dialog
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [lessonModuleId, setLessonModuleId] = useState<string | null>(null)
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    contentType: "text",
    estimatedMins: 5,
    content: {} as any,
  })

  useEffect(() => {
    fetchCourse()
  }, [courseId])

  useStudioActivity(course?.title ?? null)

  async function fetchCourse() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`)
      const data = await res.json()
      setCourse(data.course)
      setMosUnmapped(data.mosUnmappedLessonIds ?? [])
      setCanSubmit(!!data.canSubmit)
    } catch (error) {
      console.error("Failed to fetch course:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleModuleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const url = editingModule
      ? `/api/admin/modules/${editingModule.id}`
      : "/api/admin/modules"

    const res = await fetch(url, {
      method: editingModule ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...moduleForm,
        courseId: courseId,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || "Couldn't save the module")
      return
    }
    if (res.ok) {
      fetchCourse()
      setModuleDialogOpen(false)
      setEditingModule(null)
      setModuleForm({ title: "", description: "" })
    }
  }

  async function handleDeleteModule(moduleId: string) {
    if (!confirm("Delete this module and all its lessons?")) return
    await fetch(`/api/admin/modules/${moduleId}`, { method: "DELETE" })
    fetchCourse()
  }

  async function handleLessonSubmit(e: React.FormEvent) {
    e.preventDefault()

    const url = editingLesson
      ? `/api/admin/lessons/${editingLesson.id}`
      : "/api/admin/lessons"

    // Default content based on type
    let content = lessonForm.content
    if (!editingLesson) {
      switch (lessonForm.contentType) {
        case "text":
          content = { html: "<p>Enter your content here...</p>" }
          break
        case "media":
          content = { items: [] }
          break
        case "quiz":
          content = { questions: [] }
          break
        case "exercise":
          content = { type: "steps", steps: [] }
          break
        case "flashcards":
          content = { cards: [] }
          break
      }
    }

    const res = await fetch(url, {
      method: editingLesson ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...lessonForm,
        content,
        moduleId: lessonModuleId,
      }),
    })

    if (res.ok) {
      fetchCourse()
      setLessonDialogOpen(false)
      setEditingLesson(null)
      setLessonModuleId(null)
      setLessonForm({
        title: "",
        description: "",
        contentType: "text",
        estimatedMins: 5,
        content: {},
      })
    }
  }

  async function handleDeleteLesson(lessonId: string) {
    if (!confirm("Delete this lesson?")) return
    await fetch(`/api/admin/lessons/${lessonId}`, { method: "DELETE" })
    fetchCourse()
  }

  async function handleMoveLessonUp(moduleId: string, lessonId: string, currentOrder: number) {
    if (currentOrder === 0 || reordering) return
    setReordering(true)
    try {
      const res = await fetch("/api/admin/lessons/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          newOrder: currentOrder - 1,
        }),
      })
      if (res.ok) {
        fetchCourse()
      } else {
        toast.error("Failed to reorder lesson")
      }
    } catch {
      toast.error("Failed to reorder lesson")
    } finally {
      setReordering(false)
    }
  }

  async function handleMoveLessonDown(moduleId: string, lessonId: string, currentOrder: number, maxOrder: number) {
    if (currentOrder >= maxOrder || reordering) return
    setReordering(true)
    try {
      const res = await fetch("/api/admin/lessons/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          newOrder: currentOrder + 1,
        }),
      })
      if (res.ok) {
        fetchCourse()
      } else {
        toast.error("Failed to reorder lesson")
      }
    } catch {
      toast.error("Failed to reorder lesson")
    } finally {
      setReordering(false)
    }
  }

  async function handleMoveModuleUp(moduleId: string, currentOrder: number) {
    if (currentOrder === 0 || reordering) return
    setReordering(true)
    try {
      const res = await fetch("/api/admin/modules/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          newOrder: currentOrder - 1,
        }),
      })
      if (res.ok) {
        fetchCourse()
      } else {
        toast.error("Failed to reorder module")
      }
    } catch {
      toast.error("Failed to reorder module")
    } finally {
      setReordering(false)
    }
  }

  async function handleMoveModuleDown(moduleId: string, currentOrder: number, maxOrder: number) {
    if (currentOrder >= maxOrder || reordering) return
    setReordering(true)
    try {
      const res = await fetch("/api/admin/modules/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          newOrder: currentOrder + 1,
        }),
      })
      if (res.ok) {
        fetchCourse()
      } else {
        toast.error("Failed to reorder module")
      }
    } catch {
      toast.error("Failed to reorder module")
    } finally {
      setReordering(false)
    }
  }

  if (loading) {
    return (
      <PageShell>
        <Skeleton className="h-9 w-40" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-80 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </PageShell>
    )
  }

  const isCuratorOnLive = !user?.isAdmin && !!course?.isPublished

  if (!course) {
    return (
      <PageShell>
        <EmptyState icon={Layers} title="Course not found" description="It may have been deleted.">
          <Button asChild variant="outline" className="h-10">
            <Link href="/admin/courses">Back to courses</Link>
          </Button>
        </EmptyState>
      </PageShell>
    )
  }

  const lessonCount = course.modules.reduce((n, m) => n + m.lessons.length, 0)
  const minutes = course.modules.reduce((n, m) => n + m.lessons.reduce((a, l) => a + (l.estimatedMins || 0), 0), 0)
  const allOpen = course.modules.length > 0 && openModules.length === course.modules.length

  return (
    <PageShell>
      <Button asChild variant="ghost" className="-ml-2 h-9 w-fit gap-1.5 text-muted-foreground">
        <Link href="/admin/courses">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Courses
        </Link>
      </Button>

      {/* A curator's one hand-over point. Admins publish instead, so they
          don't need it. */}
      {!user?.isAdmin && !course.isPublished && (
        <CourseSubmit
          courseId={course.id}
          reviewStatus={course.reviewStatus}
          canSubmit={canSubmit}
          lessonCount={lessonCount}
          feedback={course.rejectionReason}
          onSubmitted={fetchCourse}
        />
      )}

      <PageHeader
        title={course.title}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5 text-foreground">
              <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", course.isPublished ? "bg-success" : "bg-muted-foreground/50")} />
              {course.isPublished ? "Live" : "Draft"}
            </span>
            <span data-tabular>
              {course.modules.length} module{course.modules.length === 1 ? "" : "s"} · {lessonCount} lesson{lessonCount === 1 ? "" : "s"}
              {minutes > 0 && ` · ${minutes} min`}
            </span>
            {mosUnmapped.length > 0 && (
              <span className="font-medium text-warning" data-tabular>
                {mosUnmapped.length} without a MOS link
              </span>
            )}
          </span>
        }
      >
        <Button
          onClick={() => {
            setEditingModule(null)
            setModuleForm({ title: "", description: "" })
            setModuleDialogOpen(true)
          }}
          className="h-10 gap-2 self-start"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add module
        </Button>
      </PageHeader>

      {course.description && <p className="-mt-4 max-w-3xl text-sm text-muted-foreground">{course.description}</p>}

      {isCuratorOnLive && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
          This course is live. Lesson edits go to an admin for review. Adding, removing or reordering needs an admin.
        </div>
      )}

      <ReviewActivity type="course" id={course.id} />

      {course.modules.length === 0 ? (
        <EmptyState icon={Layers} title="No modules yet" description="Modules group lessons into sections.">
          <Button onClick={() => setModuleDialogOpen(true)} className="h-10 gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add module
          </Button>
        </EmptyState>
      ) : (
        <section className="space-y-3" aria-label="Modules and lessons">
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground"
              onClick={() => setOpenModules(allOpen ? [] : course.modules.map((m) => m.id))}
            >
              {allOpen ? "Collapse all" : "Expand all"}
            </Button>
          </div>

          {course.modules
            .sort((a, b) => a.order - b.order)
            .map((module, moduleIndex) => {
              const isOpen = openModules.includes(module.id)
              const maxModuleOrder = course.modules.length - 1
              const unmappedHere = module.lessons.filter((l) => mosUnmapped.includes(l.id)).length

              return (
                <Collapsible
                  key={module.id}
                  open={isOpen}
                  onOpenChange={(open) => {
                    setOpenModules(open ? [...openModules, module.id] : openModules.filter((id) => id !== module.id))
                  }}
                >
                  <div className="overflow-hidden rounded-xl border border-border bg-card shadow-e1">
                    <div className="flex items-center gap-2 p-2 pr-3 sm:gap-3">
                      <div className="flex flex-col">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={moduleIndex === 0 || reordering}
                          onClick={() => handleMoveModuleUp(module.id, module.order)}
                          aria-label={`Move ${module.title} up`}
                        >
                          <ChevronUp className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={moduleIndex >= maxModuleOrder || reordering}
                          onClick={() => handleMoveModuleDown(module.id, module.order, maxModuleOrder)}
                          aria-label={`Move ${module.title} down`}
                        >
                          <ChevronDown className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>

                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-foreground" data-tabular>
                            {moduleIndex + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-foreground">{module.title}</span>
                            <span className="block text-xs text-muted-foreground" data-tabular>
                              {module.lessons.length} lesson{module.lessons.length !== 1 ? "s" : ""}
                              {unmappedHere > 0 && <span className="text-warning"> · {unmappedHere} without a MOS link</span>}
                            </span>
                          </span>
                          <ChevronDown
                            className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")}
                            aria-hidden="true"
                          />
                        </button>
                      </CollapsibleTrigger>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => {
                          setEditingModule(module)
                          setModuleForm({ title: module.title, description: module.description || "" })
                          setModuleDialogOpen(true)
                        }}
                        aria-label={`Edit ${module.title}`}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteModule(module.id)}
                        aria-label={`Delete ${module.title}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>

                    <CollapsibleContent>
                      <div className="border-t border-border bg-muted/20 p-3 sm:p-4">
                        {module.description && <p className="mb-3 text-sm text-muted-foreground">{module.description}</p>}

                        <ol className="space-y-2">
                          {module.lessons
                            .sort((a, b) => a.order - b.order)
                            .map((lesson, lessonIndex) => {
                              const Icon = contentTypeIcons[lesson.contentType] || FileText
                              const maxLessonOrder = module.lessons.length - 1
                              const unmapped = mosUnmapped.includes(lesson.id)

                              return (
                                <li key={lesson.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2 sm:gap-3">
                                  <div className="flex flex-col">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      disabled={lessonIndex === 0 || reordering}
                                      onClick={() => handleMoveLessonUp(module.id, lesson.id, lesson.order)}
                                      aria-label={`Move ${lesson.title} up`}
                                    >
                                      <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      disabled={lessonIndex >= maxLessonOrder || reordering}
                                      onClick={() => handleMoveLessonDown(module.id, lesson.id, lesson.order, maxLessonOrder)}
                                      aria-label={`Move ${lesson.title} down`}
                                    >
                                      <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                                    </Button>
                                  </div>

                                  <Link
                                    href={`/admin/courses/${courseId}/lesson/${lesson.id}`}
                                    className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-1 py-1.5 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  >
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                                      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-sm font-medium text-foreground">
                                        <span className="mr-1.5 text-muted-foreground" data-tabular>
                                          {moduleIndex + 1}.{lessonIndex + 1}
                                        </span>
                                        {lesson.title}
                                      </span>
                                      <span className="block text-xs capitalize text-muted-foreground">
                                        {lesson.contentType} · {lesson.estimatedMins} min
                                      </span>
                                    </span>
                                    {unmapped && (
                                      <Badge variant="outline" className="hidden shrink-0 border-warning/40 bg-warning/10 text-[11px] text-foreground sm:inline-flex">
                                        No MOS link
                                      </Badge>
                                    )}
                                  </Link>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                                    onClick={() => handleDeleteLesson(lesson.id)}
                                    aria-label={`Delete ${lesson.title}`}
                                  >
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                  </Button>
                                </li>
                              )
                            })}
                        </ol>

                        <Button
                          variant="outline"
                          className="mt-2 h-10 w-full gap-2 border-dashed"
                          onClick={() => {
                            setEditingLesson(null)
                            setLessonModuleId(module.id)
                            setLessonForm({ title: "", description: "", contentType: "text", estimatedMins: 5, content: {} })
                            setLessonDialogOpen(true)
                          }}
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                          Add lesson
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )
            })}
        </section>
      )}

      {/* Module Dialog */}
      <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModule ? "Edit module" : "Add module"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleModuleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={moduleForm.title}
                onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                placeholder="e.g. Lift and drag"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={moduleForm.description}
                onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                placeholder="Optional"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setModuleDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingModule ? "Save" : "Add"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLesson ? "Edit lesson" : "Add lesson"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLessonSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={lessonForm.title}
                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                placeholder="e.g. Angle of attack"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={lessonForm.contentType}
                onValueChange={(v) => setLessonForm({ ...lessonForm, contentType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text Content</SelectItem>
                  <SelectItem value="media">Media (Images, Videos, Links)</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="exercise">Exercise (Steps, Matching, Ordering)</SelectItem>
                  <SelectItem value="flashcards">Flashcards</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Minutes</Label>
              <Input
                type="number"
                min={1}
                value={lessonForm.estimatedMins}
                onChange={(e) => setLessonForm({ ...lessonForm, estimatedMins: parseInt(e.target.value) || 5 })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setLessonDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingLesson ? "Save" : "Add"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
