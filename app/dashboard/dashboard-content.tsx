"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  BookOpen,
  Target,
  Flame,
  Clock,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Plane,
  Cloud,
  Compass,
  Scale,
  Brain,
  Gauge,
  ClipboardList,
  Lock,
  GraduationCap,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import { useUser } from "@lib/user-context"
import { theorySubjects as allSubjects } from "@lib/mock-data"
import type React from "react"
import { useMemo } from "react"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Plane,
  Cloud,
  Compass,
  Scale,
  Brain,
  Gauge,
  ClipboardList,
}

export default function DashboardContent() {
  const { user, purchases, examAttempts, stats, isLoading, hasAccessToSubject } = useUser()

  // Aggregate exam stats per subject
  const subjectStats = useMemo(() => {
    const statsMap: Record<string, { totalQuestions: number; correctAnswers: number; examsTaken: number }> = {}
    
    for (const exam of examAttempts) {
      if (!statsMap[exam.subjectId]) {
        statsMap[exam.subjectId] = { totalQuestions: 0, correctAnswers: 0, examsTaken: 0 }
      }
      statsMap[exam.subjectId].totalQuestions += exam.totalQuestions
      statsMap[exam.subjectId].correctAnswers += exam.correctAnswers
      statsMap[exam.subjectId].examsTaken += 1
    }
    
    return statsMap
  }, [examAttempts])

  const theorySubjects = allSubjects.map((subject) => {
    const subjectExamStats = subjectStats[subject.id]
    const accuracy = subjectExamStats?.totalQuestions > 0 
      ? Math.round((subjectExamStats.correctAnswers / subjectExamStats.totalQuestions) * 100)
      : 0
    
    return {
      ...subject,
      isPurchased: hasAccessToSubject(subject.id),
      questionsAttempted: subjectExamStats?.totalQuestions || 0,
      correctAnswers: subjectExamStats?.correctAnswers || 0,
      examsTaken: subjectExamStats?.examsTaken || 0,
      accuracy,
      // Progress based on questions answered vs estimated total for subject
      progress: subjectExamStats?.totalQuestions > 0 
        ? Math.min(100, Math.round((subjectExamStats.totalQuestions / subject.totalQuestions) * 100))
        : 0,
    }
  })

  const purchasedSubjects = theorySubjects.filter((s) => s.isPurchased)
  const lockedSubjects = theorySubjects.filter((s) => !s.isPurchased)

  const recentExams = examAttempts.slice(0, 3).map((exam) => ({
    id: exam.id,
    subjectId: exam.subjectId,
    subjectName: exam.subjectName,
    date: new Date(exam.completedAt).toLocaleDateString(),
    score: exam.score,
    totalQuestions: exam.totalQuestions,
    correctAnswers: exam.correctAnswers,
    timeSpent: exam.timeSpentMins,
    passed: exam.passed,
  }))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  const displayStats = stats || {
    totalExamsTaken: 0,
    averageScore: 0,
    studyStreak: 0,
    totalStudyHours: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Welcome + Compact Stats Row */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome back, {user?.firstName || "Pilot"}</h1>
            <p className="text-muted-foreground">
              {purchasedSubjects.length > 0
                ? "Continue your CPL journey. You're making great progress!"
                : "Get started by purchasing access to your first subject."}
            </p>
          </div>
          <Link href={purchasedSubjects.length > 0 ? "/dashboard/exams" : "/dashboard/pricing"}>
            <Button className="gap-2">
              <BookOpen className="h-4 w-4" />
              {purchasedSubjects.length > 0 ? "Quick Practice" : "Get Access"}
            </Button>
          </Link>
        </div>

        {/* Compact Stats Row */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-500/10">
              <Flame className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <span className="font-semibold text-foreground">{displayStats.studyStreak}</span>
              <span className="text-muted-foreground ml-1">day streak</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div>
              <span className="font-semibold text-foreground">{displayStats.averageScore}%</span>
              <span className="text-muted-foreground ml-1">avg score</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10">
              <BookOpen className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <span className="font-semibold text-foreground">{displayStats.totalExamsTaken}</span>
              <span className="text-muted-foreground ml-1">exams</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-500/10">
              <Clock className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <span className="font-semibold text-foreground">{displayStats.totalStudyHours}h</span>
              <span className="text-muted-foreground ml-1">studied</span>
            </div>
          </div>
          {displayStats.questionsAnswered > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500/10">
                <CheckCircle2 className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <span className="font-semibold text-foreground">
                  {Math.round((displayStats.correctAnswers / displayStats.questionsAnswered) * 100)}%
                </span>
                <span className="text-muted-foreground ml-1">accuracy</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Insights - Moved up higher */}
      {purchasedSubjects.length > 0 && displayStats.totalExamsTaken > 0 && (
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">AI Insights Available</h3>
                <p className="text-sm text-muted-foreground truncate">
                  Personalized recommendations based on your {displayStats.totalExamsTaken} exams
                </p>
              </div>
              <Link href="/dashboard/insights">
                <Button size="sm" className="shrink-0">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  View Insights
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Courses with Real Progress */}
      {purchasedSubjects.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">My Courses</h2>
              <Badge variant="secondary" className="font-normal text-xs">
                {purchasedSubjects.length} active
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Link href="/dashboard/learn">
                <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground">
                  <GraduationCap className="h-4 w-4" />
                  <span className="hidden sm:inline">Learn</span>
                </Button>
              </Link>
              <Link href="/dashboard/exams">
                <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground">
                  <span className="hidden sm:inline">Practice</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {purchasedSubjects.map((subject) => {
                  const Icon = iconMap[subject.icon] || Plane
                  return (
                    <div
                      key={subject.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-foreground truncate">{subject.name}</p>
                          <Badge variant="outline" className="text-xs shrink-0 hidden sm:inline-flex">
                            {subject.code}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{subject.questionsAttempted} questions</span>
                          {subject.accuracy > 0 && (
                            <span className={subject.accuracy >= 70 ? "text-green-600" : "text-orange-500"}>
                              {subject.accuracy}% accuracy
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="hidden md:flex items-center gap-2 w-28">
                        <Progress value={subject.progress} className="h-1.5 flex-1" />
                        <span className="text-xs font-medium text-muted-foreground w-8 text-right">
                          {subject.progress}%
                        </span>
                      </div>

                      <Link href={`/dashboard/exams/${subject.id}`}>
                        <Button variant="secondary" size="sm" className="h-7 text-xs gap-1">
                          Practice
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Recent Exams */}
      {recentExams.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Recent Exams</h2>
            <Link href="/dashboard/history">
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground">
                View all
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {recentExams.map((exam) => (
                  <div key={exam.id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${exam.passed ? "bg-green-500/10" : "bg-destructive/10"}`}
                      >
                        {exam.passed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{exam.subjectName}</p>
                        <p className="text-xs text-muted-foreground">{exam.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${exam.passed ? "text-green-600" : "text-destructive"}`}>
                        {exam.score}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {exam.correctAnswers}/{exam.totalQuestions}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Available to Purchase */}
      {lockedSubjects.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">
                {purchasedSubjects.length > 0 ? "More Subjects" : "Get Started"}
              </h2>
              <Badge variant="outline" className="font-normal text-xs">
                {lockedSubjects.length} available
              </Badge>
            </div>
            <Link href="/dashboard/pricing">
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground">
                View pricing
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {lockedSubjects.slice(0, 6).map((subject) => {
              const Icon = iconMap[subject.icon] || Plane
              return (
                <Link
                  key={subject.id}
                  href="/dashboard/pricing"
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all group"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{subject.name}</p>
                    <p className="text-xs text-muted-foreground">{subject.code}</p>
                  </div>
                  <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              )
            })}
          </div>
          {lockedSubjects.length > 6 && (
            <div className="mt-3 text-center">
              <Link href="/dashboard/pricing">
                <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                  View all {lockedSubjects.length} subjects
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </section>
      )}

      {/* Empty state for new users */}
      {purchasedSubjects.length === 0 && recentExams.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Start Your CPL Journey</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Get access to comprehensive practice exams and study materials to help you pass your CASA CPL theory exams.
            </p>
            <Link href="/dashboard/pricing">
              <Button>Browse Subjects</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
