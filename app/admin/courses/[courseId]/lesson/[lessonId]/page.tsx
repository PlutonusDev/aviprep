"use client"

import { useState, useEffect, use } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  GripVertical,
  Eye,
} from "lucide-react"
import Link from "@/components/meta/link"
import { useRouter } from "next/navigation"
import RichTextEditor from "@/components/forum/rich-text-editor"

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
  const router = useRouter()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [content, setContent] = useState<any>({})

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
    } catch (error) {
      console.error("Failed to fetch lesson:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!lesson) return
    setSaving(true)
    
    try {
      await fetch(`/api/admin/lessons/${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
    } catch (error) {
      console.error("Failed to save:", error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-1/3 animate-pulse" />
        <Card className="animate-pulse">
          <CardContent className="p-6 min-h-[400px]" />
        </Card>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Lesson not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/courses/${courseId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{lesson.title}</h1>
          <p className="text-muted-foreground">
            {lesson.module.course.title} / {lesson.contentType} lesson
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Content Editor based on type */}
      {lesson.contentType === "text" && (
        <Card>
          <CardHeader>
            <CardTitle>Text Content</CardTitle>
          </CardHeader>
          <CardContent>
            <RichTextEditor
              content={content.html || ""}
              onChange={(html) => setContent({ ...content, html })}
              placeholder="Write your lesson content here..."
            />
          </CardContent>
        </Card>
      )}

      {lesson.contentType === "video" && (
        <Card>
          <CardHeader>
            <CardTitle>Video Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Video URL (YouTube, Vimeo, or direct link)</Label>
              <Input
                value={content.url || ""}
                onChange={(e) => setContent({ ...content, url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Duration (seconds)</Label>
              <Input
                type="number"
                value={content.duration || 0}
                onChange={(e) => setContent({ ...content, duration: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Transcript (optional)</Label>
              <Textarea
                value={content.transcript || ""}
                onChange={(e) => setContent({ ...content, transcript: e.target.value })}
                rows={6}
                placeholder="Video transcript for accessibility..."
              />
            </div>
          </CardContent>
        </Card>
      )}

      {lesson.contentType === "quiz" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Quiz Questions</CardTitle>
            <Button
              onClick={() => {
                const questions = content.questions || []
                setContent({
                  ...content,
                  questions: [
                    ...questions,
                    {
                      id: Date.now().toString(),
                      question: "",
                      options: ["", "", "", ""],
                      correctIndex: 0,
                      explanation: "",
                    },
                  ],
                })
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {(content.questions || []).map((q: any, qIndex: number) => (
              <div key={q.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-start gap-2">
                  <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Question {qIndex + 1}</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const questions = [...(content.questions || [])]
                          questions.splice(qIndex, 1)
                          setContent({ ...content, questions })
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={q.question}
                      onChange={(e) => {
                        const questions = [...(content.questions || [])]
                        questions[qIndex].question = e.target.value
                        setContent({ ...content, questions })
                      }}
                      placeholder="Enter question..."
                    />
                    
                    <div className="space-y-2">
                      <Label>Options (mark correct answer)</Label>
                      {q.options.map((opt: string, optIndex: number) => (
                        <div key={optIndex} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={q.correctIndex === optIndex}
                            onChange={() => {
                              const questions = [...(content.questions || [])]
                              questions[qIndex].correctIndex = optIndex
                              setContent({ ...content, questions })
                            }}
                            className="h-4 w-4"
                          />
                          <Input
                            value={opt}
                            onChange={(e) => {
                              const questions = [...(content.questions || [])]
                              questions[qIndex].options[optIndex] = e.target.value
                              setContent({ ...content, questions })
                            }}
                            placeholder={`Option ${optIndex + 1}`}
                            className={q.correctIndex === optIndex ? "border-green-500" : ""}
                          />
                        </div>
                      ))}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Explanation (shown after answer)</Label>
                      <Textarea
                        value={q.explanation || ""}
                        onChange={(e) => {
                          const questions = [...(content.questions || [])]
                          questions[qIndex].explanation = e.target.value
                          setContent({ ...content, questions })
                        }}
                        placeholder="Explain the correct answer..."
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {(!content.questions || content.questions.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No questions yet. Click "Add Question" to get started.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {lesson.contentType === "flashcards" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Flashcards</CardTitle>
            <Button
              onClick={() => {
                const cards = content.cards || []
                setContent({
                  ...content,
                  cards: [...cards, { id: Date.now().toString(), front: "", back: "" }],
                })
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Card
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {(content.cards || []).map((card: any, cardIndex: number) => (
                <div key={card.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Card {cardIndex + 1}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const cards = [...(content.cards || [])]
                        cards.splice(cardIndex, 1)
                        setContent({ ...content, cards })
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>Front</Label>
                    <Textarea
                      value={card.front}
                      onChange={(e) => {
                        const cards = [...(content.cards || [])]
                        cards[cardIndex].front = e.target.value
                        setContent({ ...content, cards })
                      }}
                      placeholder="Question or term..."
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Back</Label>
                    <Textarea
                      value={card.back}
                      onChange={(e) => {
                        const cards = [...(content.cards || [])]
                        cards[cardIndex].back = e.target.value
                        setContent({ ...content, cards })
                      }}
                      placeholder="Answer or definition..."
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            {(!content.cards || content.cards.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No flashcards yet. Click "Add Card" to get started.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {lesson.contentType === "interactive" && (
        <Card>
          <CardHeader>
            <CardTitle>Interactive Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Interactive Type</Label>
              <select
                value={content.type || "diagram"}
                onChange={(e) => setContent({ ...content, type: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                <option value="diagram">Interactive Diagram</option>
                <option value="calculator">Aviation Calculator</option>
                <option value="simulator">Mini Simulator</option>
                <option value="drag-drop">Drag & Drop Exercise</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Configuration (JSON)</Label>
              <Textarea
                value={JSON.stringify(content.config || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const config = JSON.parse(e.target.value)
                    setContent({ ...content, config })
                  } catch {
                    // Invalid JSON, don't update
                  }
                }}
                rows={10}
                className="font-mono text-sm"
                placeholder='{"instructions": "...", "elements": [...]}'
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
