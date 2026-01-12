"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import type { QuestionData } from "@lib/types"

interface ExamPageProps {
  params: Promise<{ subjectId: string }>
}

export default function ExamPage({ params }: ExamPageProps) {
  const subjectId = useParams<{ subjectId: string }>().subjectId;
  const router = useRouter()

  const [subject, setSubject] = useState<{ id: string; name: string; code: string } | null>(null)
  const [questions, setQuestions] = useState<QuestionData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set())
  const [examCompleted, setExamCompleted] = useState(false)
  const [examStartTime] = useState(Date.now())
  const [submitting, setSubmitting] = useState(false)

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

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error || !subject || questions.length === 0) {
    return (
      <div className="p-4 lg:p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground">{error || "No questions available"}</p>
            <Link href="/dashboard/exams">
              <Button variant="outline" className="mt-4 bg-transparent">
                Back to Exams
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100
  const isCorrect = selectedAnswer === currentQuestion.correctAnswer
  const answeredCount = answers.filter((a) => a !== null).length

  const handleAnswerSelect = (value: string) => {
    if (showExplanation) return
    const answerIndex = Number.parseInt(value)
    setSelectedAnswer(answerIndex)
    const newAnswers = [...answers]
    newAnswers[currentQuestionIndex] = answerIndex
    setAnswers(newAnswers)
  }

  const handleCheckAnswer = () => {
    setShowExplanation(true)
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedAnswer(answers[currentQuestionIndex + 1])
      setShowExplanation(false)
    } else {
      handleFinishExam()
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
      setSelectedAnswer(answers[currentQuestionIndex - 1])
      setShowExplanation(false)
    }
  }

  const handleFlagQuestion = () => {
    const newFlagged = new Set(flaggedQuestions)
    if (newFlagged.has(currentQuestionIndex)) {
      newFlagged.delete(currentQuestionIndex)
    } else {
      newFlagged.add(currentQuestionIndex)
    }
    setFlaggedQuestions(newFlagged)
  }

  const handleRestartExam = () => {
    setCurrentQuestionIndex(0)
    setSelectedAnswer(null)
    setShowExplanation(false)
    setAnswers(Array(questions.length).fill(null))
    setFlaggedQuestions(new Set())
    setExamCompleted(false)
  }

  const calculateScore = () => {
    let correct = 0
    answers.forEach((answer, index) => {
      if (answer === questions[index].correctAnswer) {
        correct++
      }
    })
    return { correct, total: questions.length, percentage: Math.round((correct / questions.length) * 100) }
  }

  const handleFinishExam = async () => {
    setSubmitting(true)
    const score = calculateScore()
    const timeSpentMins = Math.round((Date.now() - examStartTime) / 60000)

    // Build question results for tracking
    const questionResults = questions.map((q, index) => ({
      questionId: q.id,
      topic: q.topic,
      correct: answers[index] === q.correctAnswer,
      timeTaken: 0, // We don't track per-question time in this version
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

  if (examCompleted) {
    const score = calculateScore()
    const passed = score.percentage >= 70

    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/exams">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Exam Complete</h1>
            <p className="text-muted-foreground">{subject.name}</p>
          </div>
        </div>

        <Card className={`border-2 ${passed ? "border-[var(--success)]" : "border-destructive"}`}>
          <CardContent className="p-8 text-center">
            <div
              className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${passed ? "bg-[var(--success)]/10" : "bg-destructive/10"} mb-6`}
            >
              {passed ? (
                <CheckCircle2 className="h-10 w-10 text-[var(--success)]" />
              ) : (
                <XCircle className="h-10 w-10 text-destructive" />
              )}
            </div>
            <h2 className={`text-4xl font-bold mb-2 ${passed ? "text-[var(--success)]" : "text-destructive"}`}>
              {score.percentage}%
            </h2>
            <p className="text-lg text-muted-foreground mb-4">
              {score.correct} out of {score.total} correct
            </p>
            <Badge variant={passed ? "default" : "destructive"} className="text-sm px-4 py-1">
              {passed ? "PASSED" : "NEEDS IMPROVEMENT"}
            </Badge>
            <p className="text-sm text-muted-foreground mt-4">
              {passed
                ? "Great job! You've met the passing threshold of 70%."
                : "Keep practicing. You need 70% to pass."}
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold text-foreground">{score.correct}</p>
              <p className="text-sm text-muted-foreground">Correct Answers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold text-foreground">{score.total - score.correct}</p>
              <p className="text-sm text-muted-foreground">Incorrect Answers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold text-foreground">{flaggedQuestions.size}</p>
              <p className="text-sm text-muted-foreground">Flagged for Review</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button onClick={handleRestartExam} variant="outline" className="flex-1 bg-transparent">
            <RotateCcw className="mr-2 h-4 w-4" />
            Retry Exam
          </Button>
          <Link href="/dashboard/exams" className="flex-1">
            <Button variant="secondary" className="w-full">
              <BookOpen className="mr-2 h-4 w-4" />
              Other Subjects
            </Button>
          </Link>
          <Link href="/dashboard/history" className="flex-1">
            <Button className="w-full">View History</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
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
                <AlertDialogAction onClick={() => router.push("/dashboard/exams")}>Exit</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div>
            <h1 className="text-xl font-bold text-foreground">{subject.name}</h1>
            <p className="text-sm text-muted-foreground">Practice Mode</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {answeredCount}/{questions.length} answered
          </Badge>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <span className="text-muted-foreground">{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Navigation */}
      <div className="flex flex-wrap gap-2">
        {questions.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentQuestionIndex(index)
              setSelectedAnswer(answers[index])
              setShowExplanation(false)
            }}
            className={`h-8 w-8 rounded text-xs font-medium transition-colors ${
              index === currentQuestionIndex
                ? "bg-primary text-primary-foreground"
                : answers[index] !== null
                  ? "bg-[var(--success)]/20 text-[var(--success)]"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            } ${flaggedQuestions.has(index) ? "ring-2 ring-[var(--warning)]" : ""}`}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    currentQuestion.difficulty === "hard"
                      ? "border-destructive text-destructive"
                      : currentQuestion.difficulty === "medium"
                        ? "border-[var(--warning)] text-[var(--warning)]"
                        : "border-[var(--success)] text-[var(--success)]"
                  }
                >
                  {currentQuestion.difficulty}
                </Badge>
                <Badge variant="secondary">{currentQuestion.topic}</Badge>
              </div>
              <CardTitle className="text-lg leading-relaxed">{currentQuestion.question}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFlagQuestion}
              className={flaggedQuestions.has(currentQuestionIndex) ? "text-[var(--warning)]" : "text-muted-foreground"}
            >
              <Flag className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={selectedAnswer?.toString() ?? ""} onValueChange={handleAnswerSelect} className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index
              const isCorrectAnswer = index === currentQuestion.correctAnswer
              let optionClass = "border-border hover:border-primary/50"

              if (showExplanation) {
                if (isCorrectAnswer) {
                  optionClass = "border-[var(--success)] bg-[var(--success)]/10"
                } else if (isSelected && !isCorrectAnswer) {
                  optionClass = "border-destructive bg-destructive/10"
                }
              } else if (isSelected) {
                optionClass = "border-primary bg-primary/5"
              }

              return (
                <div
                  key={index}
                  className={`flex items-center space-x-3 rounded-lg border p-4 transition-colors ${optionClass}`}
                >
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} disabled={showExplanation} />
                  <Label
                    htmlFor={`option-${index}`}
                    className="flex-1 cursor-pointer text-sm leading-relaxed text-foreground"
                  >
                    {option}
                  </Label>
                  {showExplanation && isCorrectAnswer && <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />}
                  {showExplanation && isSelected && !isCorrectAnswer && (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                </div>
              )
            })}
          </RadioGroup>

          {/* Explanation */}
          {showExplanation && (
            <div
              className={`rounded-lg p-4 ${isCorrect ? "bg-[var(--success)]/10 border border-[var(--success)]/30" : "bg-destructive/10 border border-destructive/30"}`}
            >
              <div className="flex items-center gap-2 mb-2">
                {isCorrect ? (
                  <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <span className={`font-semibold ${isCorrect ? "text-[var(--success)]" : "text-destructive"}`}>
                  {isCorrect ? "Correct!" : "Incorrect"}
                </span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{currentQuestion.explanation}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" onClick={handlePreviousQuestion} disabled={currentQuestionIndex === 0}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            <div className="flex gap-2">
              {!showExplanation ? (
                <Button onClick={handleCheckAnswer} disabled={selectedAnswer === null}>
                  Check Answer
                </Button>
              ) : (
                <Button onClick={handleNextQuestion} disabled={submitting}>
                  {submitting
                    ? "Saving..."
                    : currentQuestionIndex === questions.length - 1
                      ? "Finish Exam"
                      : "Next Question"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
