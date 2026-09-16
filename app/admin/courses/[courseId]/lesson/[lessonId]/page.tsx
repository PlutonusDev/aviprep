"use client"

import { useState, useEffect, use } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  ImageIcon,
  Link as LinkIcon,
  FileText,
  Video,
  CheckCircle2,
  Loader2,
  Sparkles,
  Wand2,
  Layers,
  ListChecks,
  MessageSquareWarning,
} from "lucide-react"
import Link from "next/link"
import RichTextEditor from "@/components/forum/rich-text-editor"
import { toast } from "sonner"
import { cn } from "@lib/utils"
import { SUBJECTS } from "@lib/subjects"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, PageHeader, PageShell } from "@/components/hub/page-primitives"
import { MosTagger } from "@/components/admin/mos-tagger"
import { lessonMatchText } from "@lib/mos/content-text"
import type { MosLink } from "@lib/mos/subjects"

interface Lesson {
  id: string
  title: string
  description?: string
  contentType: string
  content: any
  estimatedMins: number
  /** A curator's proposed edit to a lesson in a live course. */
  pendingRevision?: { contentType?: string; content?: any } | null
  /** Why an admin declined the curator's last proposed edit. */
  rejectionReason?: string | null
  module: {
    course: {
      id: string
      title: string
      subjectId: string
    }
  }
}

export default function LessonEditorPage({
  params
}: {
  params: Promise<{ courseId: string; lessonId: string }>
}) {
  const { courseId, lessonId } = use(params)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [role, setRole] = useState<"admin" | "curator">("admin")
  const [isLive, setIsLive] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [discardReason, setDiscardReason] = useState("")
  const [content, setContent] = useState<any>({})
  const [contentType, setContentType] = useState("text")
  /** Part 61 MOS links; undefined until loaded. */
  const [mos, setMos] = useState<MosLink[] | undefined>()

  useEffect(() => {
    fetchLesson()
  }, [lessonId])

  async function fetchLesson() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/lessons/${lessonId}`)
      const data = await res.json()
      setLesson(data.lesson)
      setRole(data.role === "curator" ? "curator" : "admin")
      setIsLive(!!data.isLive)
      // A curator continues their own proposed edit, if there is one.
      const source =
        data.role === "curator" && data.lesson?.pendingRevision ? { ...data.lesson, ...data.lesson.pendingRevision } : data.lesson
      setContent(source?.content || {})
      setContentType(source?.contentType || "text")
    } catch (error) {
      console.error("Failed to fetch lesson:", error)
      toast.error("Failed to load lesson")
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!lesson) return
    setSaving(true)

    try {
      const res = await fetch(`/api/admin/lessons/${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, contentType, ...(mos !== undefined ? { mos } : {}) }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Failed to save lesson")
        return
      }
      if (data.revisionPending) {
        toast.success("Changes sent to an admin for review")
        setLesson((l) => (l ? { ...l, pendingRevision: data.lesson?.pendingRevision } : l))
      } else {
        toast.success("Lesson saved successfully")
      }
    } catch (error) {
      console.error("Failed to save:", error)
      toast.error("Failed to save lesson")
    } finally {
      setSaving(false)
    }
  }

  async function reviewRevision(action: "apply-revision" | "discard-revision", reason?: string) {
    setReviewing(true)
    try {
      const res = await fetch(`/api/admin/lessons/${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed")
      toast.success(action === "apply-revision" ? "Changes applied" : "Proposed changes discarded")
      setDiscarding(false)
      setDiscardReason("")
      await fetchLesson()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update the lesson")
    } finally {
      setReviewing(false)
    }
  }

  if (loading) {
    return (
      <PageShell>
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-8 w-80 max-w-full" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </PageShell>
    )
  }

  if (!lesson) {
    return (
      <PageShell>
        <EmptyState icon={FileText} title="Lesson not found" description="It may have been deleted.">
          <Button asChild variant="outline" className="h-10">
            <Link href={`/admin/courses/${courseId}`}>Back to course</Link>
          </Button>
        </EmptyState>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <Button asChild variant="ghost" className="-ml-2 h-9 w-fit gap-1.5 text-muted-foreground">
        <Link href={`/admin/courses/${courseId}`}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {lesson.module.course.title}
        </Link>
      </Button>

      <PageHeader
        title={lesson.title}
        description={isLive ? "In a live course" : "In a draft course"}
      >
        <Button onClick={handleSave} disabled={saving} className="h-10 gap-2 self-start">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
          {saving ? "Saving" : role === "curator" && isLive ? "Submit for review" : "Save"}
        </Button>
      </PageHeader>

      {role === "curator" && lesson.rejectionReason && !lesson.pendingRevision && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <div className="min-w-0 space-y-1">
            <p className="font-medium text-foreground">Your last edit wasn&apos;t accepted</p>
            <p className="whitespace-pre-line text-foreground/90">{lesson.rejectionReason}</p>
            <p className="text-muted-foreground">Make the changes and submit them again.</p>
          </div>
        </div>
      )}

      {role === "curator" && isLive && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
          This course is live, so saving sends your edits to an admin.
          {lesson.pendingRevision ? " You're editing your proposed version." : ""}
        </div>
      )}

      {role === "admin" && lesson.pendingRevision && (
        <div className="space-y-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          <p className="font-medium text-foreground">A curator proposed edits to this lesson.</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setContent(lesson.pendingRevision?.content ?? content)
                setContentType(lesson.pendingRevision?.contentType ?? contentType)
                toast.info("Proposed version loaded. Nothing is saved yet.")
              }}
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview edits
            </Button>
            <Button size="sm" disabled={reviewing} onClick={() => reviewRevision("apply-revision")}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Apply edits
            </Button>
            <Button variant="ghost" size="sm" disabled={reviewing || discarding} onClick={() => setDiscarding(true)}>
              Discard
            </Button>
          </div>
          {discarding && (
            <div className="space-y-2 border-t border-warning/30 pt-3">
              <Label htmlFor="discard-reason">Why aren&apos;t these edits going ahead?</Label>
              <Textarea
                id="discard-reason"
                rows={3}
                autoFocus
                maxLength={1000}
                value={discardReason}
                onChange={(e) => setDiscardReason(e.target.value)}
                aria-describedby="discard-reason-hint"
                className="resize-none bg-background"
              />
              <p id="discard-reason-hint" className="text-xs text-muted-foreground">
                Optional. The curator sees this on their home screen.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setDiscarding(false)} disabled={reviewing}>
                  Cancel
                </Button>
                <Button size="sm" disabled={reviewing} onClick={() => reviewRevision("discard-revision", discardReason.trim() || undefined)}>
                  {reviewing && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                  Discard edits
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <MosTagger
        subjectId={lesson.module.course.subjectId}
        matchText={lessonMatchText({ title: lesson.title, description: lesson.description, content })}
        value={mos}
        onChange={setMos}
        contentType="lesson"
        contentId={lesson.id}
        isAdmin={role === "admin"}
      />

      <section aria-labelledby="lesson-type-title">
        <h2 id="lesson-type-title" className="mb-3 text-base font-semibold text-foreground">
          Lesson type
        </h2>
        <div role="radiogroup" aria-labelledby="lesson-type-title" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { id: "text", label: "Text", icon: FileText, desc: "Rich text" },
            { id: "media", label: "Media", icon: ImageIcon, desc: "Images, video, links" },
            { id: "quiz", label: "Quiz", icon: CheckCircle2, desc: "Multiple choice" },
            { id: "flashcards", label: "Flashcards", icon: Layers, desc: "Study cards" },
            { id: "exercise", label: "Exercise", icon: ListChecks, desc: "Steps, matching, ordering" },
          ].map((type) => {
            const active = contentType === type.id
            return (
              <button
                key={type.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setContentType(type.id)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "border-primary bg-primary/5 shadow-e1" : "border-border hover:border-primary/40",
                )}
              >
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", active ? "bg-primary/15" : "bg-muted")}>
                  <type.icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{type.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{type.desc}</span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Content Editors */}
      {contentType === "text" && (
        <TextEditor
          content={content}
          setContent={setContent}
          lessonTitle={lesson.title}
          subjectId={lesson.module.course.subjectId}
        />
      )}

      {contentType === "media" && (
        <MediaEditor content={content} setContent={setContent} />
      )}

      {contentType === "quiz" && (
        <QuizEditor
          content={content}
          setContent={setContent}
          lessonTitle={lesson.title}
          subjectId={lesson.module.course.subjectId}
        />
      )}

      {contentType === "flashcards" && (
        <FlashcardsEditor
          content={content}
          setContent={setContent}
          lessonTitle={lesson.title}
          subjectId={lesson.module.course.subjectId}
        />
      )}

      {contentType === "exercise" && (
        <ExerciseEditor
          content={content}
          setContent={setContent}
          lessonTitle={lesson.title}
          subjectId={lesson.module.course.subjectId}
        />
      )}
    </PageShell>
  )
}

// Text Editor
function TextEditor({
  content,
  setContent,
  lessonTitle,
  subjectId,
}: {
  content: any
  setContent: (c: any) => void
  lessonTitle: string
  subjectId: string
}) {
  const [generating, setGenerating] = useState(false)
  const [topic, setTopic] = useState("")
  const [editorKey, setEditorKey] = useState(0)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch("/api/admin/courses/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: "text",
          subjectId,
          topic: topic || lessonTitle,
          lessonTitle,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setContent({ ...content, html: data.content.html })
        setEditorKey(prev => prev + 1)
        toast.success("Content generated successfully!")
      } else {
        toast.error("Failed to generate content")
      }
    } catch {
      toast.error("Failed to generate content")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Card className="shadow-e1">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Content</CardTitle>
            <CardDescription>
              Headings, lists, images and tables.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Generation Section */}
        <Card className="border-dashed border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-medium">AI Content Generator</span>
            </div>
            <div className="flex gap-3">
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={`Topic (defaults to "${lessonTitle}")`}
                className="flex-1"
              />
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                {generating ? "Generating..." : "Generate Content"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <RichTextEditor
          key={editorKey}
          content={content.html || ""}
          onChange={(html) => setContent({ ...content, html })}
          placeholder="Write your lesson content here..."
        />
      </CardContent>
    </Card>
  )
}

// Media Editor
function MediaEditor({ content, setContent }: { content: any; setContent: (c: any) => void }) {
  const items = content.items || []

  const addItem = (type: string) => {
    const newItem = {
      id: Date.now().toString(),
      type,
      url: "",
      caption: "",
      title: "",
      description: "",
    }
    setContent({ ...content, items: [...items, newItem] })
  }

  const updateItem = (index: number, updates: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], ...updates }
    setContent({ ...content, items: newItems })
  }

  const removeItem = (index: number) => {
    const newItems = items.filter((_: any, i: number) => i !== index)
    setContent({ ...content, items: newItems })
  }

  return (
    <Card className="shadow-e1">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Media</CardTitle>
          <CardDescription>
            Images, video, links and documents.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => addItem("image")}>
            <ImageIcon className="h-4 w-4 mr-1" />
            Image
          </Button>
          <Button variant="outline" size="sm" onClick={() => addItem("embed")}>
            <Video className="h-4 w-4 mr-1" />
            Video
          </Button>
          <Button variant="outline" size="sm" onClick={() => addItem("link")}>
            <LinkIcon className="h-4 w-4 mr-1" />
            Link
          </Button>
          <Button variant="outline" size="sm" onClick={() => addItem("document")}>
            <ImageIcon className="h-4 w-4 mr-1" />
            Doc
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Description (optional)</Label>
          <Textarea
            value={content.description || ""}
            onChange={(e) => setContent({ ...content, description: e.target.value })}
            placeholder="Introduction to this media content..."
            rows={2}
          />
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
            Add media items using the buttons above
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item: any, index: number) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      {item.type === "image" && <ImageIcon className="h-5 w-5" />}
                      {item.type === "embed" && <Video className="h-5 w-5" />}
                      {item.type === "link" && <LinkIcon className="h-5 w-5" />}
                      {item.type === "document" && <ImageIcon className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="capitalize">{item.type}</Badge>
                        <Button variant="ghost" size="sm" onClick={() => removeItem(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label>URL</Label>
                        <Input
                          value={item.url}
                          onChange={(e) => updateItem(index, { url: e.target.value })}
                          placeholder={item.type === "embed" ? "YouTube/Vimeo URL..." : "https://..."}
                        />
                      </div>

                      {item.type === "image" && (
                        <div className="space-y-2">
                          <Label>Caption</Label>
                          <Input
                            value={item.caption || ""}
                            onChange={(e) => updateItem(index, { caption: e.target.value })}
                            placeholder="Image caption..."
                          />
                        </div>
                      )}

                      {(item.type === "link" || item.type === "document") && (
                        <>
                          <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                              value={item.title || ""}
                              onChange={(e) => updateItem(index, { title: e.target.value })}
                              placeholder="Link title..."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                              value={item.description || ""}
                              onChange={(e) => updateItem(index, { description: e.target.value })}
                              placeholder="Brief description..."
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Quiz Editor
function QuizEditor({
  content,
  setContent,
  lessonTitle,
  subjectId,
}: {
  content: any
  setContent: (c: any) => void
  lessonTitle: string
  subjectId: string
}) {
  const [generating, setGenerating] = useState(false)
  const [topic, setTopic] = useState("")
  const questions = content.questions || []

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch("/api/admin/courses/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: "quiz",
          subjectId,
          topic: topic || lessonTitle,
          lessonTitle,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setContent({ ...content, questions: data.content.questions })
        toast.success("Quiz questions generated successfully!")
      } else {
        toast.error("Failed to generate quiz")
      }
    } catch {
      toast.error("Failed to generate quiz")
    } finally {
      setGenerating(false)
    }
  }

  const addQuestion = () => {
    const newQuestion = {
      id: Date.now().toString(),
      text: "",
      options: ["", "", "", ""],
      correctIndex: 0,
      explanation: "",
    }
    setContent({ ...content, questions: [...questions, newQuestion] })
  }

  const updateQuestion = (index: number, updates: any) => {
    const newQuestions = [...questions]
    newQuestions[index] = { ...newQuestions[index], ...updates }
    setContent({ ...content, questions: newQuestions })
  }

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const newQuestions = [...questions]
    newQuestions[qIndex].options[oIndex] = value
    setContent({ ...content, questions: newQuestions })
  }

  const removeQuestion = (index: number) => {
    const newQuestions = questions.filter((_: any, i: number) => i !== index)
    setContent({ ...content, questions: newQuestions })
  }

  return (
    <Card className="shadow-e1">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Questions</CardTitle>
          <CardDescription>
            Multiple choice, with explanations.
          </CardDescription>
        </div>
        <Button onClick={addQuestion}>
          <Plus className="mr-2 h-4 w-4" />
          Add Question
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Generation Section */}
        <Card className="border-dashed border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-medium">AI Quiz Generator</span>
            </div>
            <div className="flex gap-3">
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={`Topic (defaults to "${lessonTitle}")`}
                className="flex-1"
              />
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                {generating ? "Generating..." : "Generate Quiz"}
              </Button>
            </div>
          </CardContent>
        </Card>
        {questions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
            No questions yet. Click "Add Question" to get started.
          </div>
        ) : (
          questions.map((q: any, qIndex: number) => (
            <Card key={q.id} className="overflow-hidden">
              <div className="h-1 bg-primary" />
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">Question {qIndex + 1}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => removeQuestion(qIndex)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Question Text</Label>
                  <Textarea
                    value={q.text || q.question || ""}
                    onChange={(e) => updateQuestion(qIndex, { text: e.target.value })}
                    placeholder="Enter your question..."
                    rows={2}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Answer Options (click radio to mark correct answer)</Label>
                  {q.options.map((opt: string, oIndex: number) => (
                    <div key={oIndex} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => updateQuestion(qIndex, { correctIndex: oIndex })}
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                          q.correctIndex === oIndex
                            ? "border-success bg-success text-success-foreground"
                            : "border-muted-foreground/30 hover:border-success/50"
                        )}
                      >
                        {q.correctIndex === oIndex ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          String.fromCharCode(65 + oIndex)
                        )}
                      </button>
                      <Input
                        value={opt}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                        className={cn(
                          q.correctIndex === oIndex && "border-success"
                        )}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label>Explanation (shown after answering)</Label>
                  <Textarea
                    value={q.explanation || ""}
                    onChange={(e) => updateQuestion(qIndex, { explanation: e.target.value })}
                    placeholder="Explain why this answer is correct..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  )
}

// Flashcards Editor
function FlashcardsEditor({
  content,
  setContent,
  lessonTitle,
  subjectId,
}: {
  content: any
  setContent: (c: any) => void
  lessonTitle: string
  subjectId: string
}) {
  const [generating, setGenerating] = useState(false)
  const [topic, setTopic] = useState("")
  const cards = content.cards || []

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch("/api/admin/courses/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: "flashcards",
          subjectId,
          topic: topic || lessonTitle,
          lessonTitle,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setContent({ ...content, cards: data.content.cards })
        toast.success("Flashcards generated successfully!")
      } else {
        toast.error("Failed to generate flashcards")
      }
    } catch {
      toast.error("Failed to generate flashcards")
    } finally {
      setGenerating(false)
    }
  }

  const addCard = () => {
    const newCard = {
      id: Date.now().toString(),
      front: "",
      back: "",
    }
    setContent({ ...content, cards: [...cards, newCard] })
  }

  const updateCard = (index: number, updates: any) => {
    const newCards = [...cards]
    newCards[index] = { ...newCards[index], ...updates }
    setContent({ ...content, cards: newCards })
  }

  const removeCard = (index: number) => {
    const newCards = cards.filter((_: any, i: number) => i !== index)
    setContent({ ...content, cards: newCards })
  }

  return (
    <Card className="shadow-e1">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Flashcards</CardTitle>
          <CardDescription>
            Term on the front, answer on the back.
          </CardDescription>
        </div>
        <Button onClick={addCard}>
          <Plus className="mr-2 h-4 w-4" />
          Add Card
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Generation Section */}
        <Card className="border-dashed border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-medium">AI Flashcard Generator</span>
            </div>
            <div className="flex gap-3">
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={`Topic (defaults to "${lessonTitle}")`}
                className="flex-1"
              />
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                {generating ? "Generating..." : "Generate Flashcards"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {cards.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
            No flashcards yet. Click "Add Card" to get started.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {cards.map((card: any, index: number) => (
              <Card key={card.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Card {index + 1}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => removeCard(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground">Front (Question/Term)</Label>
                    <Textarea
                      value={card.front}
                      onChange={(e) => updateCard(index, { front: e.target.value })}
                      placeholder="Question or term..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground">Back (Answer/Definition)</Label>
                    <Textarea
                      value={card.back}
                      onChange={(e) => updateCard(index, { back: e.target.value })}
                      placeholder="Answer or definition..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Exercise Editor
function ExerciseEditor({
  content,
  setContent,
  lessonTitle,
  subjectId,
}: {
  content: any
  setContent: (c: any) => void
  lessonTitle: string
  subjectId: string
}) {
  const [generating, setGenerating] = useState(false)
  const [topic, setTopic] = useState("")
  const exerciseType = content.type || "steps"

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch("/api/admin/courses/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: "exercise",
          subjectId,
          topic: topic || lessonTitle,
          lessonTitle,
          exerciseType,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setContent(data.content)
        toast.success("Exercise generated successfully!")
      } else {
        toast.error("Failed to generate exercise")
      }
    } catch {
      toast.error("Failed to generate exercise")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Card className="shadow-e1">
      <CardHeader>
        <CardTitle>Exercise</CardTitle>
        <CardDescription>
          Steps, matching or ordering.
        </CardDescription>
      </CardHeader>
<CardContent className="space-y-6">
  {/* AI Generation Section */}
  <Card className="border-dashed border-primary/50 bg-primary/5">
    <CardContent className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-primary" />
        <span className="font-medium">AI Exercise Generator</span>
      </div>
      <div className="flex gap-3">
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={`Topic (defaults to "${lessonTitle}")`}
          className="flex-1"
        />
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          {generating ? "Generating..." : "Generate Exercise"}
        </Button>
      </div>
    </CardContent>
  </Card>

  <div className="space-y-2">
    <Label>Exercise Type</Label>
    <Select
      value={exerciseType}
      onValueChange={(value) => setContent({ ...content, type: value })}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="steps">Step-by-Step Guide</SelectItem>
        <SelectItem value="matching">Matching Exercise</SelectItem>
              <SelectItem value="ordering">Ordering Exercise</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={content.description || ""}
            onChange={(e) => setContent({ ...content, description: e.target.value })}
            placeholder="Instructions for this exercise..."
            rows={2}
          />
        </div>

        {exerciseType === "steps" && (
          <StepsEditor content={content} setContent={setContent} />
        )}

        {exerciseType === "matching" && (
          <MatchingEditor content={content} setContent={setContent} />
        )}

        {exerciseType === "ordering" && (
          <OrderingEditor content={content} setContent={setContent} />
        )}
      </CardContent>
    </Card>
  )
}

// Steps Editor
function StepsEditor({ content, setContent }: { content: any; setContent: (c: any) => void }) {
  const steps = content.steps || []

  const addStep = () => {
    const newStep = {
      id: Date.now().toString(),
      title: "",
      description: "",
      content: "",
    }
    setContent({ ...content, steps: [...steps, newStep] })
  }

  const updateStep = (index: number, updates: any) => {
    const newSteps = [...steps]
    newSteps[index] = { ...newSteps[index], ...updates }
    setContent({ ...content, steps: newSteps })
  }

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_: any, i: number) => i !== index)
    setContent({ ...content, steps: newSteps })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Steps</Label>
        <Button variant="outline" size="sm" onClick={addStep}>
          <Plus className="mr-2 h-4 w-4" />
          Add Step
        </Button>
      </div>

      {steps.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl">
          No steps yet. Click "Add Step" to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {steps.map((step: any, index: number) => (
            <Card key={step.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">Step {index + 1}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => removeStep(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={step.title}
                    onChange={(e) => updateStep(index, { title: e.target.value })}
                    placeholder="Step title..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={step.description || ""}
                    onChange={(e) => updateStep(index, { description: e.target.value })}
                    placeholder="Brief description..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// Matching Editor
function MatchingEditor({ content, setContent }: { content: any; setContent: (c: any) => void }) {
  const items = content.matchItems || []

  const addItem = () => {
    const newItem = {
      id: Date.now().toString(),
      term: "",
      definition: "",
    }
    setContent({ ...content, matchItems: [...items, newItem] })
  }

  const updateItem = (index: number, updates: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], ...updates }
    setContent({ ...content, matchItems: newItems })
  }

  const removeItem = (index: number) => {
    const newItems = items.filter((_: any, i: number) => i !== index)
    setContent({ ...content, matchItems: newItems })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Matching Pairs</Label>
        <Button variant="outline" size="sm" onClick={addItem}>
          <Plus className="mr-2 h-4 w-4" />
          Add Pair
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl">
          No pairs yet. Click "Add Pair" to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item: any, index: number) => (
            <div key={item.id} className="flex items-start gap-3">
              <Badge variant="outline" className="mt-2 shrink-0">{index + 1}</Badge>
              <div className="flex-1 grid grid-cols-2 gap-3">
                <Input
                  value={item.term}
                  onChange={(e) => updateItem(index, { term: e.target.value })}
                  placeholder="Term..."
                />
                <Input
                  value={item.definition}
                  onChange={(e) => updateItem(index, { definition: e.target.value })}
                  placeholder="Definition..."
                />
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeItem(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Ordering Editor
function OrderingEditor({ content, setContent }: { content: any; setContent: (c: any) => void }) {
  const items = content.orderItems || []

  const addItem = () => {
    const newItem = {
      id: Date.now().toString(),
      text: "",
      correctPosition: items.length,
    }
    setContent({ ...content, orderItems: [...items, newItem] })
  }

  const updateItem = (index: number, updates: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], ...updates }
    setContent({ ...content, orderItems: newItems })
  }

  const removeItem = (index: number) => {
    const newItems = items.filter((_: any, i: number) => i !== index)
    // Update correct positions
    newItems.forEach((item: any, i: number) => {
      if (item.correctPosition > index) {
        item.correctPosition = item.correctPosition - 1
      }
    })
    setContent({ ...content, orderItems: newItems })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label>Items to Order</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Enter items in their correct order. They will be shuffled for students.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={addItem}>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl">
          No items yet. Click "Add Item" to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item: any, index: number) => (
            <div key={item.id} className="flex items-center gap-3">
              <Badge variant="secondary" className="shrink-0 w-8 justify-center">
                {index + 1}
              </Badge>
              <Input
                value={item.text}
                onChange={(e) => updateItem(index, { text: e.target.value, correctPosition: index })}
                placeholder={`Item ${index + 1}...`}
                className="flex-1"
              />
              <Button variant="ghost" size="sm" onClick={() => removeItem(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
