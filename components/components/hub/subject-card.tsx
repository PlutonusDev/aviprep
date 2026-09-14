"use client"

import { Card, CardContent, CardFooter } from "../ui/card"
import { ArrowRight, Lock, Target } from "lucide-react"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Progress } from "../ui/progress"
import Link from "@/components/meta/link"
import { CourseArtHeader } from "./course-art-header"
import { useTenant } from "@lib/tenant-context"

interface SubjectCardSubject {
  id: string
  name: string
  code: string
  description: string
  licenseType?: string
  totalQuestions: number
  questionsAttempted?: number
  accuracy?: number
  averageScore: number
  examsCompleted?: number
  progress: number
  isPurchased: boolean
}

export default function SubjectCard({
  subject,
  hideButton = false,
}: {
  subject: SubjectCardSubject
  hideButton?: boolean
}) {
  const { isWhitelabeled } = useTenant()
  const locked = !subject.isPurchased
  const attempted = subject.questionsAttempted ?? 0
  const exams = subject.examsCompleted ?? 0
  const started = exams > 0

  return (
    <Card className="flex flex-col overflow-hidden p-0 shadow-e1 transition-shadow hover:shadow-e3">
      <CourseArtHeader
        title={subject.name}
        code={subject.code}
        licenseType={subject.licenseType}
        className={locked ? "opacity-70" : undefined}
      >
        {locked && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Locked
          </span>
        )}
      </CourseArtHeader>

      <CardContent className="flex flex-1 flex-col gap-4 p-4">
        {/* The art carries the name, so the body leads with what it does not say. */}
        <h3 className="sr-only">{subject.name}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{subject.description}</p>

        {locked ? (
          <div className="mt-auto flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="h-4 w-4 shrink-0" aria-hidden="true" />
            {subject.totalQuestions} practice questions
          </div>
        ) : started ? (
          <div className="mt-auto space-y-3">
            {/* Average score is the number that answers "am I ready?", so it
                gets the size. Everything else is supporting detail. */}
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Average score</p>
                <p className="font-sans text-3xl font-semibold leading-none text-foreground">
                  {subject.averageScore}%
                </p>
              </div>
              <p className="text-right text-xs text-muted-foreground">
                {exams} {exams === 1 ? "exam" : "exams"} sat
              </p>
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between text-xs">
                <span className="text-muted-foreground">Question bank</span>
                {/* A count is more use than a bare percentage. */}
                <span className="font-medium text-foreground" data-tabular>
                  {attempted} of {subject.totalQuestions}
                </span>
              </div>
              <Progress value={subject.progress} className="h-1.5" />
            </div>
          </div>
        ) : (
          <div className="mt-auto space-y-1">
            <p className="text-sm font-medium text-foreground">Not started</p>
            <p className="text-sm text-muted-foreground">
              {subject.totalQuestions} questions ready when you are.
            </p>
          </div>
        )}
      </CardContent>

      {!hideButton && (
        <CardFooter className="p-4 pt-0">
          {locked ? (
            isWhitelabeled ? (
              <p className="w-full rounded-md bg-muted px-3 py-2.5 text-center text-sm text-muted-foreground">
                Ask your school for access
              </p>
            ) : (
              <Button asChild className="h-10 w-full">
                <Link href="/dashboard/pricing">
                  <Lock className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Unlock access
                  <span className="sr-only"> to {subject.name}</span>
                </Link>
              </Button>
            )
          ) : (
            <Button asChild variant={started ? "secondary" : "default"} className="group h-10 w-full">
              <Link href={`/dashboard/exams/${subject.id}`}>
                {started ? "Continue practice" : "Start practice"}
                <ArrowRight
                  className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
                <span className="sr-only"> for {subject.name}</span>
              </Link>
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  )
}
