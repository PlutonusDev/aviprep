"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, RotateCcw, Flag, BookOpen, AlertTriangle } from "lucide-react"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import confetti from "canvas-confetti"
import type { QuestionData } from "@lib/types"

interface ExamPageProps {
  params: Promise<{ subjectId: string }>
}

export default function ExamPage({ params }: ExamPageProps) {
  const { subjectId } = use(params)
  const router = useRouter()

  const [subject, setSubject] = useState<{ id: string; name: string; passScore: number; code: string } | null>(null)
  const [questions, setQuestions] = useState<QuestionData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set())
  const [checkedQuestions, setCheckedQuestions] = useState<Set<number>>(new Set())
  const [examCompleted, setExamCompleted] = useState(false)
  const [examStartTime] = useState(Date.now())
  const [submitting, setSubmitting] = useState(false)

  const showExplanation = checkedQuestions.has(currentQuestionIndex)

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const response = await fetch(`/api/user/questions/${subjectId}`)
        if (response.status === 403) {
          setError("You don't have access to this subject. Please purchase it first.")
          return
        }
        if (!response.ok) throw new Error("Failed to fetch questions")
        const data = await response.json()
        setSubject(data.subject)
        setQuestions(data.questions)
        setAnswers(Array(data.questions.length).fill(null))
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }
    fetchQuestions()
  }, [subjectId])

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100
  const isCorrect = selectedAnswer === currentQuestion?.correctIndex
  const answeredCount = answers.filter((a) => a !== null).length

  const handleAnswerSelect = (value: string) => {
    if (checkedQuestions.has(currentQuestionIndex)) return
    const answerIndex = Number.parseInt(value)
    setSelectedAnswer(answerIndex)
    const newAnswers = [...answers]
    newAnswers[currentQuestionIndex] = answerIndex
    setAnswers(newAnswers)
  }

  const handleCheckAnswer = () => {
    setCheckedQuestions((prev) => new Set(prev).add(currentQuestionIndex))
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedAnswer(answers[currentQuestionIndex + 1])
    } else {
      handleFinishExam()
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
      setSelectedAnswer(answers[currentQuestionIndex - 1])
    }
  }

  const handleFlagQuestion = () => {
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(currentQuestionIndex)) {
        newSet.delete(currentQuestionIndex)
      } else {
        newSet.add(currentQuestionIndex)
      }
      return newSet
    })
  }

  const handleQuestionNav = (index: number) => {
    setCurrentQuestionIndex(index)
    setSelectedAnswer(answers[index])
  }

  const handleRestartExam = () => {
    setCurrentQuestionIndex(0)
    setSelectedAnswer(null)
    setAnswers(Array(questions.length).fill(null))
    setFlaggedQuestions(new Set())
    setCheckedQuestions(new Set())
    setExamCompleted(false)
  }

  const calculateScore = () => {
    let correct = 0
    answers.forEach((answer, index) => {
      if (answer === questions[index].correctIndex) {
        correct++
      }
    })
    return { correct, total: questions.length, percentage: Math.round((correct / questions.length) * 100) }
  }

  const handleFinishExam = async () => {
    setSubmitting(true)
    const score = calculateScore()
    const timeSpentMins = Math.round((Date.now() - examStartTime) / 60000)

    const questionResults = questions.map((q, index) => ({
      questionId: q.id,
      topic: q.topic,
      correct: answers[index] === q.correctIndex,
      timeTaken: 0,
    }))

    try {
      await fetch("/api/exam/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          score: score.percentage,
          totalQuestions: score.total,
          correctAnswers: score.correct,
          timeSpentMins,
          questionResults,
        }),
      })
    } catch (err) {
      console.error("Failed to save exam results:", err)
    }

    setSubmitting(false)
    setExamCompleted(true)
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (error || !subject || questions.length === 0) {
    return (
      <div className="p-4 lg:p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <AlertTriangle className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-base font-medium text-foreground">{error || "No questions available"}</p>
            <Link href="/practice/exams">
              <Button variant="outline" className="mt-3 bg-transparent" size="sm">
                Back to Exams
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (examCompleted) {
    const score = calculateScore()
    const passed = score.percentage >= subject.passScore

    if (passed) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 1 },
        colors: ["#0ea5e9", "#22c55e", "#f59e0b"],
      })
    }

    return (
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/practice/exams">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-foreground">Exam Complete</h1>
            <p className="text-sm text-muted-foreground">{subject.name}</p>
          </div>
        </div>

        <Card className={`border ${passed ? "border-green-500" : "border-red-500"}`}>
          <CardContent className="p-6 text-center">
            <div
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${passed ? "bg-green-500/10" : "bg-red-500/10"} mb-4`}
            >
              {passed ? (
                <CheckCircle2 className="h-7 w-7 text-green-500" />
              ) : (
                <XCircle className="h-7 w-7 text-red-500" />
              )}
            </div>
            <h2 className={`text-3xl font-bold mb-1 ${passed ? "text-green-500" : "text-red-500"}`}>
              {score.percentage}%
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              {score.correct} / {score.total} correct
            </p>
            <Badge className={`text-xs px-3 py-0.5 ${passed ? "bg-green-500" : "bg-red-500"}`}>
              {passed ? "PASSED" : "NEEDS IMPROVEMENT"}
            </Badge>
          </CardContent>
        </Card>

        <div className="grid gap-3 grid-cols-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{score.correct}</p>
              <p className="text-xs text-muted-foreground">Correct</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{score.total - score.correct}</p>
              <p className="text-xs text-muted-foreground">Incorrect</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{flaggedQuestions.size}</p>
              <p className="text-xs text-muted-foreground">Flagged</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleRestartExam} variant="outline" className="flex-1 bg-transparent" size="sm">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
          <Link href="/practice/exams" className="flex-1">
            <Button variant="secondary" className="w-full" size="sm">
              <BookOpen className="mr-1.5 h-3.5 w-3.5" />
              Subjects
            </Button>
          </Link>
          <Link href="/practice/history" className="flex-1">
            <Button className="w-full" size="sm">
              History
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Exit Exam?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your progress will not be saved. Are you sure you want to exit?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Continue Exam</AlertDialogCancel>
                <AlertDialogAction onClick={() => router.push("/practice/exams")}>Exit</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div>
            <h1 className="text-base font-semibold text-foreground">{subject.name}</h1>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">
          {answeredCount}/{questions.length}
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          Q{currentQuestionIndex + 1}/{questions.length}
        </span>
        <Progress value={progress} className="h-1.5 flex-1" />
        <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {questions.map((_, index) => {
          const isAnswered = answers[index] !== null
          const isChecked = checkedQuestions.has(index)
          const isFlagged = flaggedQuestions.has(index)
          const isCurrent = index === currentQuestionIndex

          let bgClass = "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          if (isCurrent) {
            bgClass = "bg-primary text-primary-foreground"
          } else if (isChecked) {
            const wasCorrect = answers[index] === questions[index].correctIndex
            bgClass = wasCorrect ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
          } else if (isAnswered) {
            bgClass = "bg-primary/20 text-primary"
          }

          return (
            <button
              key={index}
              onClick={() => handleQuestionNav(index)}
              className={`h-7 w-7 rounded text-xs font-medium transition-colors ${bgClass} ${isFlagged ? "ring-2 ring-blue-500 ring-offset-1 ring-offset-background" : ""}`}
            >
              {index + 1}
            </button>
          )
        })}
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 ${currentQuestion.difficulty === "hard"
                    ? "border-red-500 text-red-500"
                    : currentQuestion.difficulty === "medium"
                      ? "border-orange-500 text-orange-500"
                      : "border-green-500 text-green-500"
                    }`}
                >
                  {currentQuestion.difficulty}
                </Badge>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {currentQuestion.topic}
                </Badge>
              </div>
              <p className="mt-2 font-medium leading-snug text-foreground">{currentQuestion.questionText}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFlagQuestion}
              className={`h-8 w-8 shrink-0 ${flaggedQuestions.has(currentQuestionIndex) ? "text-orange-500" : "text-muted-foreground"}`}
            >
              <Flag className={`h-4 w-4 ${flaggedQuestions.has(currentQuestionIndex) ? "fill-current" : ""}`} />
            </Button>
          </div>

          <RadioGroup
            value={selectedAnswer?.toString() ?? ""}
            onValueChange={handleAnswerSelect}
            className="space-y-2"
            disabled={showExplanation}
          >
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index
              const iscorrectIndex = index === currentQuestion.correctIndex
              let optionClass = "border-border hover:border-primary/50"

              if (showExplanation) {
                if (iscorrectIndex) {
                  optionClass = "border-green-500 bg-green-500/10"
                } else if (isSelected && !iscorrectIndex) {
                  optionClass = "border-red-500 bg-red-500/10"
                } else {
                  optionClass = "border-border opacity-60"
                }
              } else if (isSelected) {
                optionClass = "border-primary bg-primary/5"
              }

              return (
                <div
                  key={index}
                  className={`flex items-center space-x-2.5 rounded-md border p-3 transition-colors ${optionClass} ${showExplanation ? "cursor-default" : "cursor-pointer"}`}
                >
                  <RadioGroupItem
                    value={index.toString()}
                    id={`option-${index}`}
                    disabled={showExplanation}
                    className="shrink-0"
                  />
                  <Label
                    htmlFor={`option-${index}`}
                    className={`flex-1 text-sm leading-snug text-foreground ${showExplanation ? "cursor-default" : "cursor-pointer"}`}
                  >
                    {option}
                  </Label>
                  {showExplanation && iscorrectIndex && (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  )}
                  {showExplanation && isSelected && !iscorrectIndex && (
                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                </div>
              )
            })}
          </RadioGroup>

          {showExplanation && (
            <div
              className={`rounded-md p-3 text-sm ${isCorrect ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {isCorrect ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className={`font-medium text-sm ${isCorrect ? "text-green-500" : "text-red-500"}`}>
                  {isCorrect ? "Correct!" : "Incorrect"}
                </span>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed">{currentQuestion.explanation}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <Button variant="ghost" onClick={handlePreviousQuestion} disabled={currentQuestionIndex === 0} size="sm">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Prev
            </Button>

            {!showExplanation ? (
              <Button onClick={handleCheckAnswer} disabled={selectedAnswer === null} size="sm">
                Check Answer
              </Button>
            ) : (
              <Button onClick={handleNextQuestion} disabled={submitting} size="sm">
                {submitting ? "Saving..." : currentQuestionIndex === questions.length - 1 ? "Finish" : "Next"}
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
