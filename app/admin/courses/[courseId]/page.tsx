"use client"

import Link from "next/link"
import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
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
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [openModules, setOpenModules] = useState<string[]>([])
  const [reordering, setReordering] = useState(false)
  
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

  async function fetchCourse() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`)
      const data = await res.json()
      setCourse(data.course)
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
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-1/3 animate-pulse" />
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-4 bg-muted rounded w-1/2 mb-4" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Course not found</p>
        <Link href="/admin/courses">
          <Button variant="link">Back to Courses</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/courses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <p className="text-muted-foreground">{course.description}</p>
        </div>
        <Badge variant={course.isPublished ? "default" : "secondary"}>
          {course.isPublished ? "Published" : "Draft"}
        </Badge>
      </div>

      {/* Modules */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Modules & Lessons</h2>
        <Button onClick={() => {
          setEditingModule(null)
          setModuleForm({ title: "", description: "" })
          setModuleDialogOpen(true)
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Module
        </Button>
      </div>

      {course.modules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">No modules yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start by creating your first module
            </p>
            <Button onClick={() => setModuleDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Module
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {course.modules
            .sort((a, b) => a.order - b.order)
            .map((module, moduleIndex) => {
              const isOpen = openModules.includes(module.id)
              const maxModuleOrder = course.modules.length - 1
              
              return (
                <Collapsible
                  key={module.id}
                  open={isOpen}
                  onOpenChange={(open) => {
                    setOpenModules(
                      open
                        ? [...openModules, module.id]
                        : openModules.filter((id) => id !== module.id)
                    )
                  }}
                >
                  <Card>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                        {/* Reorder buttons */}
                        <div className="flex flex-col gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            disabled={moduleIndex === 0 || reordering}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMoveModuleUp(module.id, module.order)
                            }}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            disabled={moduleIndex >= maxModuleOrder || reordering}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMoveModuleDown(module.id, module.order, maxModuleOrder)
                            }}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="flex-1 flex items-center gap-3">
                          <span className="font-medium">
                            Module {moduleIndex + 1}: {module.title}
                          </span>
                          <Badge variant="outline">
                            {module.lessons.length} lesson{module.lessons.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingModule(module)
                              setModuleForm({
                                title: module.title,
                                description: module.description || "",
                              })
                              setModuleDialogOpen(true)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteModule(module.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          {isOpen ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="px-4 pb-4 border-t">
                        {module.description && (
                          <p className="text-sm text-muted-foreground py-3">
                            {module.description}
                          </p>
                        )}

                        {/* Lessons */}
                        <div className="space-y-2 mt-2">
                          {module.lessons
                            .sort((a, b) => a.order - b.order)
                            .map((lesson, lessonIndex) => {
                              const Icon = contentTypeIcons[lesson.contentType] || FileText
                              const maxLessonOrder = module.lessons.length - 1
                              
                              return (
                                <div
                                  key={lesson.id}
                                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg group"
                                >
                                  {/* Reorder buttons */}
                                  <div className="flex flex-col gap-0.5">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5"
                                      disabled={lessonIndex === 0 || reordering}
                                      onClick={() => handleMoveLessonUp(module.id, lesson.id, lesson.order)}
                                    >
                                      <ArrowUp className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5"
                                      disabled={lessonIndex >= maxLessonOrder || reordering}
                                      onClick={() => handleMoveLessonDown(module.id, lesson.id, lesson.order, maxLessonOrder)}
                                    >
                                      <ArrowDown className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  
                                  <Icon className="h-4 w-4 text-muted-foreground" />
                                  <div className="flex-1 min-w-0">
                                    <span className="font-medium">
                                      {moduleIndex + 1}.{lessonIndex + 1} {lesson.title}
                                    </span>
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      ({lesson.estimatedMins} min)
                                    </span>
                                  </div>
                                  <Badge variant="outline" className="capitalize shrink-0">
                                    {lesson.contentType}
                                  </Badge>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Link href={`/admin/courses/${courseId}/lesson/${lesson.id}`}>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    </Link>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive"
                                      onClick={() => handleDeleteLesson(lesson.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              )
                            })}
                          
                          <Button
                            variant="outline"
                            className="w-full border-dashed bg-transparent"
                            onClick={() => {
                              setEditingLesson(null)
                              setLessonModuleId(module.id)
                              setLessonForm({
                                title: "",
                                description: "",
                                contentType: "text",
                                estimatedMins: 5,
                                content: {},
                              })
                              setLessonDialogOpen(true)
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Lesson
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )
            })}
        </div>
      )}

      {/* Module Dialog */}
      <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModule ? "Edit Module" : "Add Module"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleModuleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={moduleForm.title}
                onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                placeholder="Module title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={moduleForm.description}
                onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                placeholder="Brief description"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setModuleDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingModule ? "Save" : "Add Module"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLesson ? "Edit Lesson" : "Add Lesson"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLessonSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={lessonForm.title}
                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                placeholder="Lesson title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Content Type</Label>
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
              <Label>Estimated Time (minutes)</Label>
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
              <Button type="submit">{editingLesson ? "Save" : "Add Lesson"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
