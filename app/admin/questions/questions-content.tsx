"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Edit, Plus, ChevronLeft, ChevronRight, Loader2, Trash2, Sparkles } from "lucide-react"
import { SUBJECTS } from "@lib/products"
import Link from "@/components/meta/link"

interface Question {
  id: string
  subjectId: string
  topic: string
  difficulty: string
  questionText: string
  options: string[]
  correctIndex: number
  explanation: string
}

interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function QuestionsContent() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterSubject, setFilterSubject] = useState("")
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  })
  const [editQuestion, setEditQuestion] = useState<Question | null>(null)
  const [isNewQuestion, setIsNewQuestion] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchQuestions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        ...(search && { search }),
        ...(filterSubject && { subjectId: filterSubject }),
      })
      const res = await fetch(`/api/admin/questions?${params}`)
      if (res.ok) {
        const data = await res.json()
        setQuestions(data.questions)
        setPagination((prev) => ({ ...prev, total: data.total, totalPages: data.totalPages }))
      }
    } catch (error) {
      console.error("Failed to fetch questions:", error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.pageSize, search, filterSubject])

  useEffect(() => {
    const debounce = setTimeout(fetchQuestions, 300)
    return () => clearTimeout(debounce)
  }, [fetchQuestions])

  const handleNewQuestion = () => {
    setIsNewQuestion(true)
    setEditQuestion({
      id: "",
      subjectId: "",
      topic: "",
      difficulty: "medium",
      questionText: "",
      options: ["", "", "", ""],
      correctIndex: 0,
      explanation: "",
    })
  }

  const handleSaveQuestion = async () => {
    if (!editQuestion) return
    setSaving(true)
    try {
      const url = isNewQuestion ? "/api/admin/questions" : `/api/admin/questions/${editQuestion.id}`
      const method = isNewQuestion ? "POST" : "PATCH"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editQuestion),
      })

      if (res.ok) {
        setEditQuestion(null)
        setIsNewQuestion(false)
        fetchQuestions()
      }
    } catch (error) {
      console.error("Failed to save question:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteQuestion = async () => {
    if (!editQuestion?.id) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/questions/${editQuestion.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setEditQuestion(null)
        fetchQuestions()
      }
    } catch (error) {
      console.error("Failed to delete question:", error)
    } finally {
      setDeleting(false)
    }
  }

  const updateOption = (index: number, value: string) => {
    if (!editQuestion) return
    const newOptions = [...editQuestion.options]
    newOptions[index] = value
    setEditQuestion({ ...editQuestion, options: newOptions })
  }

  const difficultyColor = {
    easy: "bg-green-500/10 text-green-500",
    medium: "bg-yellow-500/10 text-yellow-500",
    hard: "bg-red-500/10 text-red-500",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Questions</h2>
          <p className="text-muted-foreground">Manage exam questions and answers</p>
        </div>
        <div className="flex gap-2">
          <Button className="cursor-pointer" variant="outline" asChild>
            <Link href="/admin/questions/generate">
              <Sparkles className="mr-2 h-4 w-4" />
              AI Generate
            </Link>
          </Button>
          <Button className="cursor-pointer" onClick={handleNewQuestion}>
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Question Bank</CardTitle>
              <CardDescription>{pagination.total} total questions</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                value={filterSubject}
                onValueChange={(v) => {
                  setFilterSubject(v)
                  setPagination((prev) => ({ ...prev, page: 1 }))
                }}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subjects</SelectItem>
                  {SUBJECTS.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search questions..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPagination((prev) => ({ ...prev, page: 1 }))
                  }}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Question</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : questions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No questions found
                    </TableCell>
                  </TableRow>
                ) : (
                  questions.map((question) => {
                    const subject = SUBJECTS.find((s) => s.id === question.subjectId)
                    return (
                      <TableRow key={question.id}>
                        <TableCell>
                          <p className="line-clamp-2 text-sm">{question.questionText}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{subject?.code || question.subjectId}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{question.topic}</TableCell>
                        <TableCell>
                          <Badge className={difficultyColor[question.difficulty as keyof typeof difficultyColor]}>
                            {question.difficulty}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button className="cursor-pointer"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setIsNewQuestion(false)
                              setEditQuestion(question)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
              Showing {Math.min((pagination.page - 1) * pagination.pageSize + 1, pagination.total)} to{" "}
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <Button className="cursor-pointer"
                variant="outline"
                size="sm"
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {pagination.page} of {pagination.totalPages || 1}
              </span>
              <Button className="cursor-pointer"
                variant="outline"
                size="sm"
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages || pagination.totalPages === 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit/Add Question Dialog */}
      <Dialog
        open={!!editQuestion}
        onOpenChange={() => {
          setEditQuestion(null)
          setIsNewQuestion(false)
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNewQuestion ? "Add Question" : "Edit Question"}</DialogTitle>
            <DialogDescription>
              {isNewQuestion ? "Create a new exam question" : "Update the question details"}
            </DialogDescription>
          </DialogHeader>
          {editQuestion && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select
                    value={editQuestion.subjectId}
                    onValueChange={(v) => setEditQuestion({ ...editQuestion, subjectId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select
                    value={editQuestion.difficulty}
                    onValueChange={(v) => setEditQuestion({ ...editQuestion, difficulty: v })}
                  >
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
                <Label htmlFor="topic">Topic</Label>
                <Input
                  id="topic"
                  value={editQuestion.topic}
                  onChange={(e) => setEditQuestion({ ...editQuestion, topic: e.target.value })}
                  placeholder="e.g., Bernoulli's Principle"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="questionText">Question</Label>
                <Textarea
                  id="questionText"
                  value={editQuestion.questionText}
                  onChange={(e) => setEditQuestion({ ...editQuestion, questionText: e.target.value })}
                  placeholder="Enter the question text..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Answer Options</Label>
                <p className="text-xs text-muted-foreground">Select the correct answer by clicking the radio button</p>
                {editQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={editQuestion.correctIndex === index}
                      onChange={() => setEditQuestion({ ...editQuestion, correctIndex: index })}
                      className="h-4 w-4"
                    />
                    <Input
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="explanation">Explanation</Label>
                <Textarea
                  id="explanation"
                  value={editQuestion.explanation}
                  onChange={(e) => setEditQuestion({ ...editQuestion, explanation: e.target.value })}
                  placeholder="Explain why the correct answer is correct..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between">
            <div>
              {!isNewQuestion && (
                <Button className="cursor-pointer" variant="destructive" onClick={handleDeleteQuestion} disabled={deleting}>
                  {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button className="cursor-pointer"
                variant="outline"
                onClick={() => {
                  setEditQuestion(null)
                  setIsNewQuestion(false)
                }}
              >
                Cancel
              </Button>
              <Button className="cursor-pointer" onClick={handleSaveQuestion} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isNewQuestion ? "Create" : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
