"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { 
  CheckCircle2, 
  XCircle, 
  ChevronLeft, 
  ChevronRight,
  RotateCcw,
  Play,
  Pause,
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
    case "video":
      return <VideoLesson lesson={lesson} />
    case "quiz":
      return <QuizLesson lesson={lesson} onComplete={onComplete} isCompleted={isCompleted} />
    case "flashcards":
      return <FlashcardsLesson lesson={lesson} />
    case "interactive":
      return <InteractiveLesson lesson={lesson} />
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

// Video Lesson Component
function VideoLesson({ lesson }: { lesson: any }) {
  const { url, duration } = lesson.content

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{lesson.title}</h1>
      {lesson.description && (
        <p className="text-muted-foreground">{lesson.description}</p>
      )}
      <div className="aspect-video bg-muted rounded-lg overflow-hidden">
        {url ? (
          <iframe
            src={url}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Play className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
      </div>
      {duration && (
        <p className="text-sm text-muted-foreground">Duration: {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}</p>
      )}
    </div>
  )
}

// Quiz Lesson Component
function QuizLesson({ lesson, onComplete, isCompleted }: { lesson: any; onComplete: () => void; isCompleted: boolean }) {
  const questions = lesson.content.questions || []
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState<boolean[]>([])
  const [quizCompleted, setQuizCompleted] = useState(false)

  const question = questions[currentQuestion]

  const handleSubmit = () => {
    if (selectedAnswer === null) return

    const isCorrect = parseInt(selectedAnswer) === question.correctIndex
    const newAnswers = [...answers, isCorrect]
    setAnswers(newAnswers)

    if (isCorrect) {
      setScore(score + 1)
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
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No questions available for this quiz.</p>
      </div>
    )
  }

  if (quizCompleted) {
    const percentage = Math.round((score / questions.length) * 100)
    const passed = percentage >= 70

    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className={cn(
            "mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full",
            passed ? "bg-success/10" : "bg-destructive/10"
          )}>
            {passed ? (
              <CheckCircle2 className="h-10 w-10 text-success" />
            ) : (
              <XCircle className="h-10 w-10 text-destructive" />
            )}
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {passed ? "Quiz Passed!" : "Quiz Not Passed"}
          </h2>
          <p className="text-muted-foreground mb-6">
            You scored {score} out of {questions.length} ({percentage}%)
          </p>
          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={handleRetry}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{lesson.title}</h1>
        <Badge variant="outline">
          Question {currentQuestion + 1} of {questions.length}
        </Badge>
      </div>

      <Progress value={((currentQuestion + 1) / questions.length) * 100} className="h-2" />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{question.text}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={selectedAnswer || ""}
            onValueChange={setSelectedAnswer}
            disabled={showResult}
          >
            {question.options.map((option: string, index: number) => {
              const isCorrect = index === question.correctIndex
              const isSelected = parseInt(selectedAnswer || "") === index

              return (
                <div
                  key={index}
                  className={cn(
                    "flex items-center space-x-3 rounded-lg border p-4 transition-colors",
                    showResult && isCorrect && "border-success bg-success/10",
                    showResult && isSelected && !isCorrect && "border-destructive bg-destructive/10",
                    !showResult && "hover:bg-muted/50 cursor-pointer"
                  )}
                >
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                  <Label 
                    htmlFor={`option-${index}`} 
                    className="flex-1 cursor-pointer"
                  >
                    {option}
                  </Label>
                  {showResult && isCorrect && (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  )}
                  {showResult && isSelected && !isCorrect && (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                </div>
              )
            })}
          </RadioGroup>

          {showResult && question.explanation && (
            <div className="rounded-lg bg-muted p-4 mt-4">
              <p className="text-sm font-medium mb-1">Explanation:</p>
              <p className="text-sm text-muted-foreground">{question.explanation}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            {!showResult ? (
              <Button onClick={handleSubmit} disabled={selectedAnswer === null}>
                Check Answer
              </Button>
            ) : (
              <Button onClick={handleNext}>
                {currentQuestion < questions.length - 1 ? (
                  <>
                    Next Question
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                ) : (
                  "See Results"
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Flashcards Lesson Component
function FlashcardsLesson({ lesson }: { lesson: any }) {
  const cards = lesson.content.cards || []
  const [currentCard, setCurrentCard] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [completed, setCompleted] = useState<Set<number>>(new Set())

  if (cards.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No flashcards available.</p>
      </div>
    )
  }

  const card = cards[currentCard]

  const handleNext = () => {
    if (currentCard < cards.length - 1) {
      setCurrentCard(currentCard + 1)
      setFlipped(false)
    }
  }

  const handlePrev = () => {
    if (currentCard > 0) {
      setCurrentCard(currentCard - 1)
      setFlipped(false)
    }
  }

  const handleMarkKnown = () => {
    setCompleted(new Set(Array.from(completed).concat(currentCard)))
    handleNext()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{lesson.title}</h1>
        <Badge variant="outline">
          {currentCard + 1} / {cards.length}
        </Badge>
      </div>

      <Progress value={((completed.size) / cards.length) * 100} className="h-2" />

      <div 
        className="cursor-pointer perspective-1000"
        onClick={() => setFlipped(!flipped)}
      >
        <Card className={cn(
          "min-h-[300px] transition-all duration-500 transform-style-3d",
          flipped && "rotate-y-180"
        )}>
          <CardContent className="flex items-center justify-center p-8 min-h-[300px]">
            <div className={cn(
              "text-center",
              flipped && "rotate-y-180"
            )}>
              {!flipped ? (
                <>
                  <p className="text-xs text-muted-foreground mb-4">QUESTION</p>
                  <p className="text-xl font-medium">{card.front}</p>
                  <p className="text-sm text-muted-foreground mt-6">Click to reveal answer</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-4">ANSWER</p>
                  <p className="text-xl font-medium">{card.back}</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handlePrev} disabled={currentCard === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        <div className="flex gap-2">
          {flipped && (
            <Button variant="outline" onClick={handleMarkKnown}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Got it!
            </Button>
          )}
        </div>

        <Button variant="outline" onClick={handleNext} disabled={currentCard === cards.length - 1}>
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}

// Interactive Lesson Component
function InteractiveLesson({ lesson }: { lesson: any }) {
  const { type, config } = lesson.content

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{lesson.title}</h1>
      {lesson.description && (
        <p className="text-muted-foreground">{lesson.description}</p>
      )}

      {type === "diagram" && (
        <DiagramInteractive config={config} />
      )}

      {type === "calculator" && (
        <CalculatorInteractive config={config} />
      )}

      {type === "simulator" && (
        <SimulatorInteractive config={config} />
      )}

      {!type && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Interactive content loading...</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Interactive sub-components
function DiagramInteractive({ config }: { config: any }) {
  const [selectedPart, setSelectedPart] = useState<string | null>(null)

  return (
    <Card>
      <CardContent className="p-6">
        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
          {config?.imageUrl ? (
            <img src={config.imageUrl || "/img/AviPrep-logo.opong"} alt="Diagram" className="max-w-full max-h-full object-contain" />
          ) : (
            <p className="text-muted-foreground">Interactive diagram</p>
          )}
        </div>
        {config?.parts && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {config.parts.map((part: any) => (
              <Button
                key={part.id}
                variant={selectedPart === part.id ? "default" : "outline"}
                onClick={() => setSelectedPart(part.id)}
                className="justify-start"
              >
                {part.name}
              </Button>
            ))}
          </div>
        )}
        {selectedPart && config?.parts && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm">
              {config.parts.find((p: any) => p.id === selectedPart)?.description}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CalculatorInteractive({ config }: { config: any }) {
  const [inputs, setInputs] = useState<Record<string, number>>({})
  const [result, setResult] = useState<number | null>(null)

  const calculate = () => {
    if (config?.formula) {
      try {
        // Simple formula evaluation (in production, use a proper math parser)
        let formula = config.formula
        for (const [key, value] of Object.entries(inputs)) {
          formula = formula.replace(new RegExp(key, 'g'), value.toString())
        }
        // eslint-disable-next-line no-eval
        setResult(eval(formula))
      } catch {
        setResult(null)
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{config?.title || "Calculator"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {config?.inputs?.map((input: any) => (
          <div key={input.name} className="space-y-2">
            <Label>{input.label} ({input.unit})</Label>
            <input
              type="number"
              className="w-full px-3 py-2 border rounded-md bg-background"
              placeholder={input.placeholder}
              onChange={(e) => setInputs({ ...inputs, [input.name]: parseFloat(e.target.value) })}
            />
          </div>
        ))}
        <Button onClick={calculate} className="w-full">Calculate</Button>
        {result !== null && (
          <div className="p-4 bg-primary/10 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Result</p>
            <p className="text-2xl font-bold">{result.toFixed(2)} {config?.resultUnit}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SimulatorInteractive({ config }: { config: any }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-muted-foreground">
          {config?.description || "Simulator content"}
        </p>
        <Button className="mt-4">
          <Play className="h-4 w-4 mr-2" />
          Start Simulation
        </Button>
      </CardContent>
    </Card>
  )
}
