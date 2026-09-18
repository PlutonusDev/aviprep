"use client"

import React from "react"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useUser } from "@lib/user-context"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  BookOpen,
  Clock,
  Users,
  ChevronRight,
  GripVertical,
  FileText,
  Video,
  HelpCircle,
  Layers,
  Send,
  CreditCard,
} from "lucide-react"
import { LICENSE_TYPES, getSubjectsByLicense } from "@lib/subjects"
import Link from "@/components/meta/link"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, PageHeader, PageShell } from "@/components/hub/page-primitives"
import { CourseArtHeader } from "@/components/hub/course-art-header"
import { cn } from "@lib/utils"

interface Course {
  id: string
  subjectId: string
  title: string
  description: string
  thumbnail?: string
  estimatedHours: number
  difficulty: string
  order: number
  isPublished: boolean
  reviewStatus?: string | null
  /** Curators: they've written something in it, so it's theirs to submit. */
  canSubmit?: boolean
  hasPendingRevision?: boolean
  _count: {
    modules: number
    /** Admins only. */
    enrollments?: number
  }
}

export default function CoursesAdminContent() {
  const { user } = useUser()
  const isAdmin = !!user?.isAdmin
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLicense, setSelectedLicense] = useState("cpl")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)

  const [formData, setFormData] = useState({
    subjectId: "",
    title: "",
    description: "",
    estimatedHours: 1,
    difficulty: "beginner",
  })

  useEffect(() => {
    fetchCourses()
  }, [selectedLicense])

  async function fetchCourses() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/courses?license=${selectedLicense}`)
      const data = await res.json()
      setCourses(data.courses || [])
    } catch (error) {
      console.error("Failed to fetch courses:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const url = editingCourse
      ? `/api/admin/courses/${editingCourse.id}`
      : "/api/admin/courses"

    const res = await fetch(url, {
      method: editingCourse ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })

    const saved = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(saved.error || "Couldn't save the course")
      return
    }
    if (saved.revisionPending) toast.success("Changes sent to an admin for review")
    if (res.ok) {
      fetchCourses()
      setIsCreateOpen(false)
      setEditingCourse(null)
      setFormData({
        subjectId: "",
        title: "",
        description: "",
        estimatedHours: 1,
        difficulty: "beginner",
      })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this course?")) return

    await fetch(`/api/admin/courses/${id}`, { method: "DELETE" })
    fetchCourses()
  }

  async function courseAction(id: string, action: "submit" | "apply-revision" | "discard-revision") {
    const res = await fetch(`/api/admin/courses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return toast.error(data.error || "Couldn't update the course")
    toast.success(
      action === "submit" ? "Submitted for review" : action === "apply-revision" ? "Changes applied" : "Proposed changes discarded",
    )
    fetchCourses()
  }

  async function handleTogglePublish(id: string, isPublished: boolean) {
    const res = await fetch(`/api/admin/courses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !isPublished }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || "Couldn't update the course", { duration: 8000 })
      return
    }
    toast.success(isPublished ? "Course unpublished" : "Course is live")
    fetchCourses()
  }

  const subjects = getSubjectsByLicense(selectedLicense as any)
  const availableLicenses = LICENSE_TYPES/*.filter(l => l.available)*/

  return (
    <PageShell>
      <PageHeader title="Courses" description={isAdmin ? "Learning content by licence." : "Write and submit learning content."}>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingCourse(null)
              setFormData({
                subjectId: "",
                title: "",
                description: "",
                estimatedHours: 1,
                difficulty: "beginner",
              })
            }} className="h-10 gap-2 self-start">
              <Plus className="h-4 w-4" aria-hidden="true" />
              New course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingCourse ? "Edit course" : "New course"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select
                  value={formData.subjectId}
                  onValueChange={(v) => setFormData({ ...formData, subjectId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Aerodynamics fundamentals"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What students will learn"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hours</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData({ ...formData, estimatedHours: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(v) => setFormData({ ...formData, difficulty: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCourse ? "Save" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div role="group" aria-label="Licence" className="flex flex-wrap gap-1.5">
        {availableLicenses.map((license) => {
          const active = selectedLicense === license.id
          return (
            <button
              key={license.id}
              type="button"
              aria-pressed={active}
              onClick={() => setSelectedLicense(license.id)}
              className={cn(
                "inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              {license.name}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          description={`Nothing for ${LICENSE_TYPES.find((l) => l.id === selectedLicense)?.name ?? "this licence"} yet.`}
        >
          <Button onClick={() => setIsCreateOpen(true)} className="h-10 gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New course
          </Button>
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const subject = subjects.find((x) => x.id === course.subjectId)
            const status = course.isPublished
              ? "Live"
              : course.reviewStatus === "review"
                ? "In review"
                : course.reviewStatus === "changes"
                  ? "Changes requested"
                  : course.reviewStatus === "rejected"
                    ? "Rejected"
                    : "Draft"
            return (
              <li key={course.id} className="min-w-0">
                <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-e1 transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-e2">
                  <CourseArtHeader thumbnail={course.thumbnail} title={subject?.name ?? course.title} code={subject?.code} licenseType={subject?.licenseType} />
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                            <span
                              aria-hidden="true"
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                course.isPublished
                                  ? "bg-success"
                                  : course.reviewStatus === "review" || course.reviewStatus === "changes"
                                    ? "bg-warning"
                                    : course.reviewStatus === "rejected"
                                      ? "bg-destructive"
                                      : "bg-muted-foreground/50",
                              )}
                            />
                            {status}
                          </span>
                          {course.hasPendingRevision && (
                            <Badge variant="outline" className="border-warning/40 bg-warning/10 text-[11px] text-foreground">
                              Edits proposed
                            </Badge>
                          )}
                        </div>
                        <h2 className="mt-1 line-clamp-2 font-semibold text-foreground">{course.title}</h2>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="-mr-2 h-8 w-8 shrink-0" aria-label={`Actions for ${course.title}`}>
                            <MoreVertical className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingCourse(course)
                              setFormData({
                                subjectId: course.subjectId,
                                title: course.title,
                                description: course.description,
                                estimatedHours: course.estimatedHours,
                                difficulty: course.difficulty,
                              })
                              setIsCreateOpen(true)
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                            Edit details
                          </DropdownMenuItem>
                          {isAdmin ? (
                            <>
                              <DropdownMenuItem onClick={() => handleTogglePublish(course.id, course.isPublished)}>
                                {course.isPublished ? "Unpublish" : "Publish"}
                              </DropdownMenuItem>
                              {(course.hasPendingRevision || (!course.isPublished && course.reviewStatus === "review")) && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/review?item=course:${course.id}`}>
                                    {course.hasPendingRevision ? "Review proposed edits" : "Review course"}
                                  </Link>
                                </DropdownMenuItem>
                              )}
                            </>
                          ) : (
                            course.canSubmit &&
                            !course.isPublished &&
                            course.reviewStatus !== "review" && (
                              <DropdownMenuItem onClick={() => courseAction(course.id, "submit")}>
                                {course.reviewStatus === "changes" || course.reviewStatus === "rejected" ? "Resubmit for review" : "Submit for review"}
                              </DropdownMenuItem>
                            )
                          )}
                          {(isAdmin || !course.isPublished) && (
                            <DropdownMenuItem onClick={() => handleDelete(course.id)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {course.description && <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{course.description}</p>}

                    <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground" data-tabular>
                      <span className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                        {course._count.modules} module{course._count.modules === 1 ? "" : "s"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        {course.estimatedHours}h
                      </span>
                      {course._count.enrollments !== undefined && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" aria-hidden="true" />
                          {course._count.enrollments} enrolled
                        </span>
                      )}
                    </p>

                    <div className="mt-auto flex gap-2 pt-4">
                      <Button asChild variant="outline" className="h-10 flex-1 gap-1.5">
                        <Link href={`/admin/courses/${course.id}`}>
                          Open course
                          <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </Button>
                      {/* A curator's draft says what to do with it, rather than
                          hiding the only way forward in the actions menu. */}
                      {!isAdmin && course.canSubmit && !course.isPublished && course.reviewStatus !== "review" && (
                        <Button
                          className="h-10 shrink-0 gap-1.5"
                          onClick={() => courseAction(course.id, "submit")}
                        >
                          <Send className="h-4 w-4" aria-hidden="true" />
                          {course.reviewStatus === "changes" || course.reviewStatus === "rejected" ? "Resubmit" : "Submit"}
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      )}
    </PageShell>
  )
}
