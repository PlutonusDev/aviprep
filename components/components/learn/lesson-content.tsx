"use client"

import React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Lightbulb,
  Trophy,
  Flame,
  Sparkles,
  GripVertical,
  ArrowRight,
  BookOpen,
  ImageIcon,
  Link as LinkIcon,
  FileText,
  Check,
} from "lucide-react"
import { cn } from "@lib/utils"

interface LessonContentProps {
  lesson: {
    id: string
    title: string
    description?: string
    contentType: string
    content: any
    estimatedMins: number
  }
  onComplete: () => void
  isCompleted: boolean
}

export function LessonContent({ lesson, onComplete, isCompleted }: LessonContentProps) {
  switch (lesson.contentType) {
    case "text":
      return <TextLesson lesson={lesson} />
    case "media":
    case "video":
      return <MediaLesson lesson={lesson} />
    case "quiz":
      return <QuizLesson lesson={lesson} onComplete={onComplete} isCompleted={isCompleted} />
    case "flashcards":
      return <FlashcardsLesson lesson={lesson} onComplete={onComplete} isCompleted={isCompleted} />
    case "exercise":
    case "interactive":
      return <ExerciseLesson lesson={lesson} onComplete={onComplete} isCompleted={isCompleted} />
    default:
      return <TextLesson lesson={lesson} />
  }
}

// Text Lesson Component
function TextLesson({ lesson }: { lesson: any }) {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <div
        dangerouslySetInnerHTML={{ __html: lesson.content.html || "" }}
        className="tiptap-content"
      />
    </div>
  )
}

// Media Lesson Component (replaces Video)
function MediaLesson({ lesson }: { lesson: any }) {
  const { items = [], description } = lesson.content

  // Fallback for old video format
  if (lesson.content.url && !items.length) {
    return (
      <div className="space-y-6">
        <div className="aspect-video bg-muted rounded-xl overflow-hidden border">
          <iframe
            src={lesson.content.url}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        {lesson.content.transcript && (
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Transcript
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {lesson.content.transcript}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {description && (
        <p className="text-muted-foreground">{description}</p>
      )}

      <div className="space-y-4">
        {items.map((item: any, index: number) => (
          <Card key={index} className="overflow-hidden">
            {item.type === "image" && (
              <div className="relative">
                <img
                  src={item.url || "/placeholder.svg"}
                  alt={item.caption || `Image ${index + 1}`}
                  className="w-full h-auto"
                />
                {item.caption && (
                  <div className="p-4 bg-muted/50">
                    <p className="text-sm text-muted-foreground">{item.caption}</p>
                  </div>
                )}
              </div>
            )}

            {item.type === "embed" && (
              <div className="aspect-video">
                <iframe
                  src={item.url}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            {item.type === "link" && (
              <CardContent className="p-4">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 hover:bg-muted/50 -m-4 p-4 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <LinkIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.title || item.url}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </a>
              </CardContent>
            )}

            {item.type === "document" && (
              <CardContent className="p-4">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 hover:bg-muted/50 -m-4 p-4 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.title || "Document"}</p>
                    <p className="text-sm text-muted-foreground">Click to open</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </a>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {items.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No media content available.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Quiz Lesson Component - Redesigned
function QuizLesson({ lesson, onComplete, isCompleted }: { lesson: any; onComplete: () => void; isCompleted: boolean }) {
  const questions = lesson.content.questions || []
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState<boolean[]>([])
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [streak, setStreak] = useState(0)

  const question = questions[currentQuestion]

  const handleSelectAnswer = (index: number) => {
    if (showResult) return
    setSelectedAnswer(index)
  }

  const handleSubmit = () => {
    if (selectedAnswer === null) return

    const isCorrect = selectedAnswer === question.correctIndex
    const newAnswers = [...answers, isCorrect]
    setAnswers(newAnswers)

    if (isCorrect) {
      setScore(score + 1)
      setStreak(streak + 1)
    } else {
      setStreak(0)
    }

    setShowResult(true)
  }

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setSelectedAnswer(null)
      setShowResult(false)
    } else {
      setQuizCompleted(true)
      if (!isCompleted) {
        onComplete()
      }
    }
  }

  const handleRetry = () => {
    setCurrentQuestion(0)
    setSelectedAnswer(null)
    setShowResult(false)
    setScore(0)
    setAnswers([])
    setQuizCompleted(false)
    setStreak(0)
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No questions available for this quiz.</p>
        </CardContent>
      </Card>
    )
  }

  if (quizCompleted) {
    const percentage = Math.round((score / questions.length) * 100)
    const passed = percentage >= 70

    return (
      <div className="max-w-lg mx-auto">
        <Card className="overflow-hidden">
          <div className={cn(
            "h-2",
            passed ? "bg-success" : "bg-destructive"
          )} />
          <CardContent className="pt-8 pb-8 text-center">
            <div className={cn(
              "mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full",
              passed ? "bg-success/10" : "bg-destructive/10"
            )}>
              {passed ? (
                <Trophy className="h-12 w-12 text-success" />
              ) : (
                <RotateCcw className="h-12 w-12 text-destructive" />
              )}
            </div>

            <h2 className="text-2xl font-bold mb-2">
              {passed ? "Great job!" : "Keep practicing!"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {passed
                ? "You've demonstrated a solid understanding of this material."
                : "Review the material and try again to improve your score."
              }
            </p>

            <div className="flex justify-center gap-8 mb-8">
              <div className="text-center">
                <p className="text-4xl font-bold text-foreground">{percentage}%</p>
                <p className="text-sm text-muted-foreground">Score</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-foreground">{score}/{questions.length}</p>
                <p className="text-sm text-muted-foreground">Correct</p>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={handleRetry}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="font-mono">
            {currentQuestion + 1} / {questions.length}
          </Badge>
          {streak >= 2 && (
            <Badge variant="outline" className="gap-1 text-warning border-warning/30 bg-warning/10">
              <Flame className="h-3 w-3" />
              {streak} streak
            </Badge>
          )}
        </div>
        <Progress
          value={((currentQuestion) / questions.length) * 100}
          className="flex-1 h-2 max-w-xs"
        />
      </div>

      {/* Question Card */}
      <Card className="overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <p className="text-lg md:text-xl font-medium mb-6">{question.text || question.question}</p>

          <div className="space-y-3">
            {question.options.map((option: string, index: number) => {
              const isCorrect = index === question.correctIndex
              const isSelected = selectedAnswer === index

              return (
                <button
                  key={index}
                  onClick={() => handleSelectAnswer(index)}
                  disabled={showResult}
                  className={cn(
                    "w-full flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all",
                    !showResult && "hover:border-primary/50 hover:bg-primary/5 cursor-pointer",
                    !showResult && isSelected && "border-primary bg-primary/5",
                    showResult && isCorrect && "border-success bg-success/10",
                    showResult && isSelected && !isCorrect && "border-destructive bg-destructive/10",
                    showResult && !isSelected && !isCorrect && "opacity-50"
                  )}
                >
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                    !showResult && isSelected && "border-primary bg-primary text-primary-foreground",
                    !showResult && !isSelected && "border-muted-foreground/30",
                    showResult && isCorrect && "border-success bg-success text-success-foreground",
                    showResult && isSelected && !isCorrect && "border-destructive bg-destructive text-destructive-foreground"
                  )}>
                    {showResult && isCorrect ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : showResult && isSelected && !isCorrect ? (
                      <XCircle className="h-4 w-4" />
                    ) : (
                      String.fromCharCode(65 + index)
                    )}
                  </div>
                  <span className="flex-1">{option}</span>
                </button>
              )
            })}
          </div>

          {/* Explanation */}
          {showResult && question.explanation && (
            <div className="mt-6 rounded-xl bg-primary/5 border border-primary/20 p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm mb-1">Explanation</p>
                  <p className="text-sm text-muted-foreground">{question.explanation}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
            {!showResult ? (
              <Button
                onClick={handleSubmit}
                disabled={selectedAnswer === null}
                size="lg"
              >
                Check Answer
              </Button>
            ) : (
              <Button onClick={handleNext} size="lg">
                {currentQuestion < questions.length - 1 ? (
                  <>
                    Continue
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                ) : (
                  <>
                    See Results
                    <Sparkles className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Flashcards Lesson Component - Redesigned with 3D flip
function FlashcardsLesson({ lesson, onComplete, isCompleted }: { lesson: any; onComplete: () => void; isCompleted: boolean }) {
  const cards = lesson.content.cards || []
  const [currentCard, setCurrentCard] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState<Set<number>>(new Set())
  const [learning, setLearning] = useState<Set<number>>(new Set())
  const [completed, setCompleted] = useState(false)

  if (cards.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No flashcards available.</p>
        </CardContent>
      </Card>
    )
  }

  const card = cards[currentCard]
  const remainingCards = cards.length - known.size
  const progress = (known.size / cards.length) * 100

  const handleFlip = () => {
    setFlipped(!flipped)
  }

  const handleKnown = () => {
    const newKnown = new Set(known)
    newKnown.add(currentCard)
    setKnown(newKnown)

    // Remove from learning if it was there
    const newLearning = new Set(learning)
    newLearning.delete(currentCard)
    setLearning(newLearning)

    moveToNext(newKnown)
  }

  const handleLearning = () => {
    const newLearning = new Set(learning)
    newLearning.add(currentCard)
    setLearning(newLearning)
    moveToNext(known)
  }

  const moveToNext = (currentKnown: Set<number>) => {
    setFlipped(false)

    // Check if all cards are known
    if (currentKnown.size === cards.length) {
      setCompleted(true)
      if (!isCompleted) {
        onComplete()
      }
      return
    }

    // Find next card that isn't known
    let next = (currentCard + 1) % cards.length
    while (currentKnown.has(next)) {
      next = (next + 1) % cards.length
    }
    setCurrentCard(next)
  }

  const handleReset = () => {
    setCurrentCard(0)
    setFlipped(false)
    setKnown(new Set())
    setLearning(new Set())
    setCompleted(false)
  }

  if (completed) {
    return (
      <div className="max-w-lg mx-auto">
        <Card className="overflow-hidden">
          <div className="h-2 bg-success" />
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-success/10">
              <Trophy className="h-12 w-12 text-success" />
            </div>

            <h2 className="text-2xl font-bold mb-2">All cards mastered!</h2>
            <p className="text-muted-foreground mb-6">
              You've reviewed all {cards.length} flashcards in this set.
            </p>

            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Study Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Progress Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge variant="secondary">
            {known.size} / {cards.length} mastered
          </Badge>
          {learning.size > 0 && (
            <Badge variant="outline" className="text-xs text-warning border-warning/30 bg-warning/10">
              {learning.size} learning
            </Badge>
          )}
        </div>
        <Progress value={progress} className="flex-1 h-2 max-w-[120px]" />
      </div>

      {/* Flashcard */}
      <div
        className="relative cursor-pointer"
        onClick={handleFlip}
        style={{ perspective: "1000px" }}
      >
        <div
          className={cn(
            "relative w-full transition-transform duration-500",
            flipped ? "[transform:rotateY(-180deg)]" : "[transform:rotateY(0deg)]"
          )}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Front - Always at 0 degrees */}
          <Card
            className="min-h-[320px] md:min-h-[360px]"
            style={{ backfaceVisibility: "hidden" }}
          >
            <CardContent className="flex flex-col items-center justify-center p-8 min-h-[320px] md:min-h-[360px] text-center">
              <Badge variant="outline" className="mb-6 text-xs uppercase tracking-wider">
                Question
              </Badge>
              <p className="text-xl md:text-2xl font-medium leading-relaxed">{card.front}</p>
              <p className="text-sm text-muted-foreground mt-8">Tap to reveal answer</p>
            </CardContent>
          </Card>

          {/* Back - Always at 180 degrees relative to parent */}
          <Card
            className="absolute inset-0 min-h-[320px] md:min-h-[360px] [transform:rotateY(180deg)]"
            style={{ backfaceVisibility: "hidden" }}
          >
            <CardContent className="flex flex-col items-center justify-center p-8 min-h-[320px] md:min-h-[360px] text-center bg-primary/5">
              <Badge className="mb-6 text-xs uppercase tracking-wider bg-primary/20 text-primary border-0">
                Answer
              </Badge>
              <p className="text-xl md:text-2xl font-medium leading-relaxed">{flipped && card.back}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Card indicators */}
      <div className="flex justify-center gap-1.5 flex-wrap">
        {cards.map((_: any, index: number) => (
          <button
            key={index}
            onClick={() => {
              if (!known.has(index)) {
                setCurrentCard(index)
                setFlipped(false)
              }
            }}
            className={cn(
              "h-2 w-2 rounded-full transition-all",
              index === currentCard && "w-6 bg-primary",
              index !== currentCard && known.has(index) && "bg-success",
              index !== currentCard && learning.has(index) && "bg-warning",
              index !== currentCard && !known.has(index) && !learning.has(index) && "bg-muted-foreground/30"
            )}
          />
        ))}
      </div>

      {/* Actions - only show when flipped */}
      <div className={cn("flex items-center justify-center gap-3",
        !flipped && "hidden"
      )}>
        <Button
          variant="outline"
          onClick={(e) => { e.stopPropagation(); handleLearning(); }}
          className="flex-1 max-w-[160px] border-warning/30 text-warning hover:bg-warning/10 hover:text-warning"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Still Learning
        </Button>
        <Button
          onClick={(e) => { e.stopPropagation(); handleKnown(); }}
          className="flex-1 max-w-[160px] bg-success hover:bg-success/90"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Got It!
        </Button>
      </div>
    </div>
  )
}

// Exercise Lesson Component (replaces Interactive)
function ExerciseLesson({ lesson, onComplete, isCompleted }: { lesson: any; onComplete: () => void; isCompleted: boolean }) {
  const { type, steps = [], matchItems = [], orderItems = [], description } = lesson.content
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [exerciseCompleted, setExerciseCompleted] = useState(false)

  // Matching state
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null)
  const [matches, setMatches] = useState<Map<number, number>>(new Map())

  // Ordering state
  const [orderedItems, setOrderedItems] = useState<any[]>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  useEffect(() => {
    if (type === "ordering" && orderItems.length > 0 && orderedItems.length === 0) {
      // Shuffle items for ordering exercise
      const shuffled = [...orderItems].sort(() => Math.random() - 0.5)
      setOrderedItems(shuffled)
    }
  }, [type, orderItems, orderedItems.length])

  const handleStepComplete = () => {
    const newCompleted = new Set(completedSteps)
    newCompleted.add(currentStep)
    setCompletedSteps(newCompleted)

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      setExerciseCompleted(true)
      if (!isCompleted) {
        onComplete()
      }
    }
  }

  const handleMatchSelect = (index: number, side: "left" | "right") => {
    if (side === "left") {
      setSelectedLeft(selectedLeft === index ? null : index)
    } else if (selectedLeft !== null) {
      // Make a match
      const newMatches = new Map(matches)
      newMatches.set(selectedLeft, index)
      setMatches(newMatches)
      setSelectedLeft(null)

      // Check if all matched
      if (newMatches.size === matchItems.length) {
        setExerciseCompleted(true)
        if (!isCompleted) {
          onComplete()
        }
      }
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newItems = [...orderedItems]
    const draggedItem = newItems[draggedIndex]
    newItems.splice(draggedIndex, 1)
    newItems.splice(index, 0, draggedItem)
    setOrderedItems(newItems)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const checkOrder = () => {
    const isCorrect = orderedItems.every((item, index) => item.correctPosition === index)
    if (isCorrect) {
      setExerciseCompleted(true)
      if (!isCompleted) {
        onComplete()
      }
    }
  }

  if (exerciseCompleted) {
    return (
      <div className="max-w-lg mx-auto">
        <Card className="overflow-hidden">
          <div className="h-2 bg-success" />
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-success/10">
              <Trophy className="h-12 w-12 text-success" />
            </div>

            <h2 className="text-2xl font-bold mb-2">Exercise Complete!</h2>
            <p className="text-muted-foreground mb-6">
              Great work on completing this exercise.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Step-by-step exercise
  if (type === "steps" && steps.length > 0) {
    const step = steps[currentStep]

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Badge variant="secondary" className="font-mono">
            Step {currentStep + 1} of {steps.length}
          </Badge>
          <Progress value={(completedSteps.size / steps.length) * 100} className="flex-1 h-2 max-w-xs" />
        </div>

        <Card>
          <CardContent className="p-6 md:p-8">
            <h3 className="text-lg font-semibold mb-4">{step.title}</h3>
            {step.description && (
              <p className="text-muted-foreground mb-6">{step.description}</p>
            )}
            {step.content && (
              <div className="prose prose-slate dark:prose-invert max-w-none mb-6"
                dangerouslySetInnerHTML={{ __html: step.content }}
              />
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleStepComplete}>
                {currentStep < steps.length - 1 ? (
                  <>
                    Mark Complete & Continue
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                ) : (
                  <>
                    Complete Exercise
                    <Check className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Step indicators */}
        <div className="flex justify-center gap-2">
          {steps.map((_: any, index: number) => (
            <button
              key={index}
              onClick={() => index <= Math.max(...Array.from(completedSteps), currentStep) && setCurrentStep(index)}
              className={cn(
                "h-2 w-2 rounded-full transition-all",
                index === currentStep && "w-6 bg-primary",
                index !== currentStep && completedSteps.has(index) && "bg-success",
                index !== currentStep && !completedSteps.has(index) && "bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
      </div>
    )
  }

  // Matching exercise
  if (type === "matching" && matchItems.length > 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {description && <p className="text-muted-foreground text-center">{description}</p>}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <p className="text-sm font-medium text-center text-muted-foreground">Terms</p>
            {matchItems.map((item: any, index: number) => {
              const isMatched = matches.has(index)
              return (
                <button
                  key={index}
                  onClick={() => !isMatched && handleMatchSelect(index, "left")}
                  disabled={isMatched}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 text-left transition-all",
                    !isMatched && selectedLeft === index && "border-primary bg-primary/5",
                    !isMatched && selectedLeft !== index && "border-border hover:border-primary/50",
                    isMatched && "border-success bg-success/10 opacity-50"
                  )}
                >
                  {item.term}
                </button>
              )
            })}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-center text-muted-foreground">Definitions</p>
            {matchItems.map((item: any, index: number) => {
              const isMatched = Array.from(matches.values()).includes(index)
              return (
                <button
                  key={index}
                  onClick={() => !isMatched && selectedLeft !== null && handleMatchSelect(index, "right")}
                  disabled={isMatched || selectedLeft === null}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 text-left transition-all",
                    !isMatched && selectedLeft !== null && "border-border hover:border-primary/50 cursor-pointer",
                    !isMatched && selectedLeft === null && "border-border opacity-50",
                    isMatched && "border-success bg-success/10 opacity-50"
                  )}
                >
                  {item.definition}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Ordering exercise
  if (type === "ordering" && orderedItems.length > 0) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        {description && <p className="text-muted-foreground text-center">{description}</p>}

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Drag and drop to arrange in the correct order
            </p>
            <div className="space-y-2">
              {orderedItems.map((item: any, index: number) => (
                <div
                  key={item.id || index}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border-2 bg-card cursor-move transition-all",
                    draggedIndex === index && "border-primary bg-primary/5 opacity-50"
                  )}
                >
                  <GripVertical className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="flex-1">{item.text}</span>
                  <Badge variant="outline" className="shrink-0">{index + 1}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button onClick={checkOrder} size="lg">
            Check Order
            <Check className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    )
  }

  // Fallback for old interactive format or no content
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Exercise content loading...</p>
      </CardContent>
    </Card>
  )
}
