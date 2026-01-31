"use client"

import { useState, useEffect, use } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
} from "lucide-react"
import Link from "next/link"
import RichTextEditor from "@/components/forum/rich-text-editor"
import { toast } from "sonner"
import { cn } from "@lib/utils"

interface Lesson {
  id: string
  title: string
  description?: string
  contentType: string
  content: any
  estimatedMins: number
  module: {
    course: {
      id: string
      title: string
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
  const [content, setContent] = useState<any>({})
  const [contentType, setContentType] = useState("text")

  useEffect(() => {
    fetchLesson()
  }, [lessonId])

  async function fetchLesson() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/lessons/${lessonId}`)
      const data = await res.json()
      setLesson(data.lesson)
      setContent(data.lesson?.content || {})
      setContentType(data.lesson?.contentType || "text")
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
        body: JSON.stringify({ content, contentType }),
      })
      
      if (res.ok) {
        toast.success("Lesson saved successfully")
      } else {
        throw new Error("Failed to save")
      }
    } catch (error) {
      console.error("Failed to save:", error)
      toast.error("Failed to save lesson")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Lesson not found</p>
        <Link href={`/admin/courses/${courseId}`}>
          <Button variant="outline" className="mt-4 bg-transparent">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Course
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/admin/courses/${courseId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{lesson.title}</h1>
          <p className="text-muted-foreground">
            {lesson.module.course.title}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Content Type Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Lesson Type</CardTitle>
          <CardDescription>
            Choose the type of content for this lesson
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { id: "text", label: "Text", icon: FileText, desc: "Rich text content" },
              { id: "media", label: "Media", icon: ImageIcon, desc: "Images, videos, links" },
              { id: "quiz", label: "Quiz", icon: CheckCircle2, desc: "Multiple choice" },
              { id: "flashcards", label: "Flashcards", icon: GripVertical, desc: "Study cards" },
              { id: "exercise", label: "Exercise", icon: GripVertical, desc: "Interactive tasks" },
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setContentType(type.id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                  contentType === type.id 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <type.icon className={cn(
                  "h-6 w-6",
                  contentType === type.id ? "text-primary" : "text-muted-foreground"
                )} />
                <span className="font-medium text-sm">{type.label}</span>
                <span className="text-xs text-muted-foreground">{type.desc}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Content Editors */}
      {contentType === "text" && (
        <TextEditor content={content} setContent={setContent} />
      )}

      {contentType === "media" && (
        <MediaEditor content={content} setContent={setContent} />
      )}

      {contentType === "quiz" && (
        <QuizEditor content={content} setContent={setContent} />
      )}

      {contentType === "flashcards" && (
        <FlashcardsEditor content={content} setContent={setContent} />
      )}

      {contentType === "exercise" && (
        <ExerciseEditor content={content} setContent={setContent} />
      )}
    </div>
  )
}

// Text Editor
function TextEditor({ content, setContent }: { content: any; setContent: (c: any) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Text Content</CardTitle>
        <CardDescription>
          Write your lesson content using the rich text editor
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RichTextEditor
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Media Content</CardTitle>
          <CardDescription>
            Add images, videos, links, and documents
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
function QuizEditor({ content, setContent }: { content: any; setContent: (c: any) => void }) {
  const questions = content.questions || []

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Quiz Questions</CardTitle>
          <CardDescription>
            Create multiple choice questions with explanations
          </CardDescription>
        </div>
        <Button onClick={addQuestion}>
          <Plus className="mr-2 h-4 w-4" />
          Add Question
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
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
function FlashcardsEditor({ content, setContent }: { content: any; setContent: (c: any) => void }) {
  const cards = content.cards || []

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Flashcards</CardTitle>
          <CardDescription>
            Create study cards with questions/terms on front and answers/definitions on back
          </CardDescription>
        </div>
        <Button onClick={addCard}>
          <Plus className="mr-2 h-4 w-4" />
          Add Card
        </Button>
      </CardHeader>
      <CardContent>
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
function ExerciseEditor({ content, setContent }: { content: any; setContent: (c: any) => void }) {
  const exerciseType = content.type || "steps"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exercise Content</CardTitle>
        <CardDescription>
          Create interactive exercises for students
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
