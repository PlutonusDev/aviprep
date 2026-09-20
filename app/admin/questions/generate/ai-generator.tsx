"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Sparkles, Plus, Check, X, ArrowLeft } from "lucide-react"
import { SUBJECTS } from "@lib/products"
import Link from "@/components/meta/link"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, PageHeader, PageShell } from "@/components/hub/page-primitives"
import { cn } from "@lib/utils"

interface GeneratedQuestion {
  subjectId: string
  topic: string
  difficulty: string
  questionText: string
  options: string[]
  correctIndex: number
  explanation: string
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
  const unsaved = generatedQuestions.length - savedIndexes.size

  return (
    <PageShell>
      <Button asChild variant="ghost" className="-ml-2 h-9 w-fit gap-1.5 text-muted-foreground">
        <Link href="/admin/questions">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Questions
        </Link>
      </Button>

      <PageHeader title="AI generator" description="Draft questions from the Part 61 MOS. Everything saves as a draft for review." />

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="h-fit space-y-4 rounded-xl border border-border bg-card p-4 shadow-e1 sm:p-5 lg:sticky lg:top-20 lg:col-span-2" aria-label="Settings">
          <div className="space-y-2">
            <Label htmlFor="gen-subject">Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger id="gen-subject" className="h-11">
                <SelectValue placeholder="Choose a subject" />
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
            <Label htmlFor="gen-topic">Topic</Label>
            <Input
              id="gen-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Weather fronts"
              className="h-11"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="gen-difficulty">Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger id="gen-difficulty" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gen-count">How many</Label>
              <Select value={count} onValueChange={setCount}>
                <SelectTrigger id="gen-count" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["1", "3", "5", "10"].map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gen-context">Extra instructions</Label>
            <Textarea
              id="gen-context"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Optional. e.g. focus on calculations"
              rows={4}
            />
          </div>

          <Button onClick={handleGenerate} disabled={generating || !subjectId || !topic} className="h-11 w-full gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
            {generating ? "Generating" : "Generate"}
          </Button>
        </section>

        <section className="space-y-4 lg:col-span-3" aria-label="Results" aria-busy={generating}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">
              Results
              {generatedQuestions.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground" data-tabular>
                  {savedIndexes.size} of {generatedQuestions.length} saved
                </span>
              )}
            </h2>
            {unsaved > 0 && (
              <Button onClick={handleSaveAll} size="sm" variant="outline" className="h-9 gap-1.5">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Save all {unsaved}
              </Button>
            )}
          </div>

          {generating ? (
            <div className="space-y-3">
              {Array.from({ length: Math.min(3, Number.parseInt(count)) }).map((_, i) => (
                <Skeleton key={i} className="h-56 rounded-xl" />
              ))}
            </div>
          ) : generatedQuestions.length === 0 ? (
            <EmptyState icon={Sparkles} title="Nothing yet" description="Pick a subject and topic, then generate." />
          ) : (
            <ol className="space-y-3">
              {generatedQuestions.map((question, index) => {
                const saved = savedIndexes.has(index)
                return (
                  <li
                    key={index}
                    className={cn(
                      "space-y-3 rounded-xl border bg-card p-4 shadow-e1 transition-colors",
                      saved ? "border-success/40" : "border-border",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="font-mono">
                          {subject?.code}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {question.difficulty}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{question.topic}</span>
                      </div>
                      {saved ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                          <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                          Saved as draft
                        </span>
                      ) : (
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1"
                            onClick={() => handleSaveQuestion(index)}
                            disabled={savingIndex === index}
                          >
                            {savingIndex === index ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveQuestion(index)}
                            aria-label="Discard question"
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <p className="font-medium text-foreground">{question.questionText}</p>

                    <ul className="space-y-1.5">
                      {question.options.map((option, optIndex) => {
                        const correct = optIndex === question.correctIndex
                        return (
                          <li
                            key={optIndex}
                            className={cn(
                              "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
                              correct ? "border-success/40 bg-success/10 text-foreground" : "border-border text-foreground",
                            )}
                          >
                            <span className="font-mono text-xs text-muted-foreground">{String.fromCharCode(65 + optIndex)}</span>
                            <span className="flex-1">{option}</span>
                            {correct && <Check className="h-4 w-4 shrink-0 text-success" aria-label="Correct answer" />}
                          </li>
                        )
                      })}
                    </ul>

                    <details className="group rounded-md bg-muted/40 px-3 py-2 text-sm">
                      <summary className="cursor-pointer list-none text-xs font-medium text-muted-foreground group-open:mb-1.5">
                        Explanation
                      </summary>
                      <p className="text-foreground">{question.explanation}</p>
                    </details>
                  </li>
                )
              })}
            </ol>
          )}
        </section>
      </div>
    </PageShell>
  )
}
