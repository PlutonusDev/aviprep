"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Sparkles, Plus, Check, X, ArrowLeft } from "lucide-react"
import { SUBJECTS } from "@lib/products"
import Link from "next/link"

interface GeneratedQuestion {
  subjectId: string
  topic: string
  difficulty: string
  questionText: string
  options: string[]
  correctIndex: number
  explanation: string
  reference: string
}

export function AIQuestionGenerator() {
  const [prompt, setPrompt] = useState("")
  const [subjectId, setSubjectId] = useState("")
  const [topic, setTopic] = useState("")
  const [difficulty, setDifficulty] = useState("medium")
  const [count, setCount] = useState("3")
  const [generating, setGenerating] = useState(false)
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([])
  const [savedIndexes, setSavedIndexes] = useState<Set<number>>(new Set())
  const [savingIndex, setSavingIndex] = useState<number | null>(null)

  const handleGenerate = async () => {
    if (!subjectId || !topic) return

    setGenerating(true)
    setGeneratedQuestions([])
    setSavedIndexes(new Set())

    try {
      const res = await fetch("/api/admin/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          topic,
          difficulty,
          count: Number.parseInt(count),
          additionalContext: prompt,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setGeneratedQuestions(data.questions)
      }
    } catch (error) {
      console.error("Failed to generate questions:", error)
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveQuestion = async (index: number) => {
    const question = generatedQuestions[index]
    setSavingIndex(index)

    try {
      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(question),
      })

      if (res.ok) {
        setSavedIndexes((prev) => new Set(prev).add(index))
      }
    } catch (error) {
      console.error("Failed to save question:", error)
    } finally {
      setSavingIndex(null)
    }
  }

  const handleSaveAll = async () => {
    for (let i = 0; i < generatedQuestions.length; i++) {
      if (!savedIndexes.has(i)) {
        await handleSaveQuestion(i)
      }
    }
  }

  const handleRemoveQuestion = (index: number) => {
    setGeneratedQuestions((prev) => prev.filter((_, i) => i !== index))
    setSavedIndexes((prev) => {
      const newSet = new Set<number>()
      prev.forEach((i) => {
        if (i < index) newSet.add(i)
        else if (i > index) newSet.add(i - 1)
      })
      return newSet
    })
  }

  const subject = SUBJECTS.find((s) => s.id === subjectId)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/questions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Question Generator</h2>
          <p className="text-muted-foreground">Generate exam questions using AI with RAG context</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Generation Settings</CardTitle>
            <CardDescription>Configure how questions should be generated</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Topic</Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Bernoulli's Principle, Weather Fronts, VOR Navigation"
              />
            </div>

            <div className="space-y-2">
              <Label>Number of Questions</Label>
              <Select value={count} onValueChange={setCount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 question</SelectItem>
                  <SelectItem value="3">3 questions</SelectItem>
                  <SelectItem value="5">5 questions</SelectItem>
                  <SelectItem value="10">10 questions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Additional Context (Optional)</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Add any specific requirements, reference materials, or context for the AI to consider when generating questions..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                The AI will use CASA CPL syllabus content as RAG context along with any additional info you provide
              </p>
            </div>

            <Button onClick={handleGenerate} disabled={generating || !subjectId || !topic} className="w-full">
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Questions
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Generated Questions Panel */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Generated Questions</CardTitle>
                <CardDescription>
                  {generatedQuestions.length > 0
                    ? `${generatedQuestions.length} questions generated`
                    : "Questions will appear here"}
                </CardDescription>
              </div>
              {generatedQuestions.length > 0 && (
                <Button onClick={handleSaveAll} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Save All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {generatedQuestions.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
                <div className="text-center">
                  <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Configure settings and click generate to create questions
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {generatedQuestions.map((question, index) => (
                  <div key={index} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{subject?.code}</Badge>
                        <Badge
                          className={
                            question.difficulty === "easy"
                              ? "bg-green-500/10 text-green-500"
                              : question.difficulty === "medium"
                                ? "bg-yellow-500/10 text-yellow-500"
                                : "bg-red-500/10 text-red-500"
                          }
                        >
                          {question.difficulty}
                        </Badge>
                        <Badge variant="secondary">{question.topic}</Badge>
                      </div>
                      <div className="flex gap-1">
                        {savedIndexes.has(index) ? (
                          <Badge className="bg-green-500">
                            <Check className="mr-1 h-3 w-3" />
                            Saved
                          </Badge>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleSaveQuestion(index)}
                              disabled={savingIndex === index}
                            >
                              {savingIndex === index ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500"
                              onClick={() => handleRemoveQuestion(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <p className="font-medium">{question.questionText}</p>

                    <div className="space-y-1">
                      {question.options.map((option, optIndex) => (
                        <div
                          key={optIndex}
                          className={`rounded px-3 py-1.5 text-sm ${
                            optIndex === question.correctIndex
                              ? "bg-green-500/10 text-green-500 font-medium"
                              : "bg-muted"
                          }`}
                        >
                          {String.fromCharCode(65 + optIndex)}. {option}
                        </div>
                      ))}
                    </div>

                    <div className="rounded bg-muted/50 p-3">
                      <p className="text-xs font-medium text-muted-foreground">Explanation:</p>
                      <p className="text-sm">{question.explanation}</p>
                    </div>
                    <div className="rounded bg-muted/50 p-3">
                      <p className="text-xs font-medium text-muted-foreground">Reference:</p>
                      <p className="text-sm">{question.reference}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
