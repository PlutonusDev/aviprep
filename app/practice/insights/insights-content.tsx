"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BrainCircuit,
  AlertTriangle,
  Target,
  TrendingUp,
  Lightbulb,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import type { SubjectData, WeakPointData, UserStats } from "@lib/types"

export default function InsightsContent() {
  const [subjects, setSubjects] = useState<SubjectData[]>([])
  const [weakPoints, setWeakPoints] = useState<WeakPointData[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [subjectsRes, statsRes] = await Promise.all([fetch("/api/user/subjects"), fetch("/api/user/stats")])

        if (!subjectsRes.ok || !statsRes.ok) {
          throw new Error("Failed to fetch data")
        }

        const subjectsData = await subjectsRes.json()
        const statsData = await statsRes.json()

        setSubjects(subjectsData.subjects)
        setWeakPoints(statsData.weakPoints || [])
        setStats(statsData.stats)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-32" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 lg:p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium text-red-500">Error loading insights</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const purchasedSubjects = subjects.filter((s) => s.isPurchased)
  const subjectsWithScores = purchasedSubjects.filter((s) => s.averageScore > 0)

  const strongestSubject =
    subjectsWithScores.length > 0
      ? subjectsWithScores.reduce((prev, curr) => (prev.averageScore > curr.averageScore ? prev : curr))
      : null
  const weakestSubject =
    subjectsWithScores.length > 0
      ? subjectsWithScores.reduce((prev, curr) => (prev.averageScore < curr.averageScore ? prev : curr))
      : null

  const highPriorityWeakPoints = weakPoints.filter((w) => w.priority === "high")
  const mediumPriorityWeakPoints = weakPoints.filter((w) => w.priority === "medium")
  const lowPriorityWeakPoints = weakPoints.filter((w) => w.priority === "low")

  const hasData = stats && stats.totalExams > 0

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Insights</h1>
          <p className="text-muted-foreground">Personalized recommendations based on your performance</p>
        </div>
        <Badge variant="outline" className="w-fit gap-2 px-3 py-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>Powered by AI Analysis</span>
        </Badge>
      </div>

      {/* AI Summary Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shrink-0">
              <BrainCircuit className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Performance Analysis Summary</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {hasData ? (
                  <>
                    Based on your recent exam history, you're performing{" "}
                    {stats.averageScore >= 80
                      ? "excellently"
                      : stats.averageScore >= 70
                        ? "well"
                        : "with room for improvement"}{" "}
                    with a <span className="text-foreground font-medium">{stats.averageScore}% average score</span>.
                    {strongestSubject && (
                      <>
                        {" "}
                        Your strongest area is{" "}
                        <span className="text-green-500 font-medium">{strongestSubject.name}</span> (
                        {strongestSubject.averageScore}%)
                      </>
                    )}
                    {weakestSubject && strongestSubject && weakestSubject.id !== strongestSubject.id && (
                      <>
                        , while <span className="text-orange-500 font-medium">{weakestSubject.name}</span> (
                        {weakestSubject.averageScore}%) needs the most attention
                      </>
                    )}
                    .{" "}
                    {weakPoints.length > 0 &&
                      `I've identified ${weakPoints.length} specific topics where focused study could significantly improve your scores.`}
                  </>
                ) : (
                  <>
                    Complete some practice exams to receive personalized AI insights about your performance. I'll
                    analyze your results to identify strengths, weaknesses, and provide targeted study recommendations.
                  </>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <span className="font-medium text-foreground">Strongest Area</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{strongestSubject?.name || "—"}</p>
            <p className="text-sm text-muted-foreground">
              {strongestSubject ? `${strongestSubject.averageScore}% average` : "No data yet"}
            </p>
            {strongestSubject && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Keep up the excellent work! Consider helping others in study groups.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-orange-500" />
              </div>
              <span className="font-medium text-foreground">Focus Area</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{weakestSubject?.name || "—"}</p>
            <p className="text-sm text-muted-foreground">
              {weakestSubject ? `${weakestSubject.averageScore}% average` : "No data yet"}
            </p>
            {weakestSubject && (
              <div className="mt-3 pt-3 border-t border-border">
                <Link href={`/practice/exams/${weakestSubject.id}`}>
                  <Button variant="ghost" size="sm" className="w-full gap-2 text-primary">
                    Practice Now
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <span className="font-medium text-foreground">Weak Points</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{weakPoints.length} Topics</p>
            <p className="text-sm text-muted-foreground">{highPriorityWeakPoints.length} high priority</p>
            {weakPoints.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Address these topics to potentially boost your overall score by 8-12%.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weak Points Section */}
      {weakPoints.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">AI-Identified Weak Points</h2>
          </div>

          {/* High Priority */}
          {highPriorityWeakPoints.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-red-500">High Priority</span>
              </div>
              {highPriorityWeakPoints.map((weakPoint) => (
                <WeakPointCard key={weakPoint.id} weakPoint={weakPoint} />
              ))}
            </div>
          )}

          {/* Medium Priority */}
          {mediumPriorityWeakPoints.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-500">Medium Priority</span>
              </div>
              {mediumPriorityWeakPoints.map((weakPoint) => (
                <WeakPointCard key={weakPoint.id} weakPoint={weakPoint} />
              ))}
            </div>
          )}

          {/* Low Priority */}
          {lowPriorityWeakPoints.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-500">Low Priority</span>
              </div>
              {lowPriorityWeakPoints.map((weakPoint) => (
                <WeakPointCard key={weakPoint.id} weakPoint={weakPoint} />
              ))}
            </div>
          )}
        </section>
      ) : hasData ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium text-foreground">Great performance!</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              No significant weak points identified. Keep practicing to maintain your knowledge.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Study Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-orange-500" />
            Study Recommendations
          </CardTitle>
          <CardDescription>Personalized tips to optimize your learning</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {hasData ? (
              <>
                {highPriorityWeakPoints.length > 0 && (
                  <div className="flex gap-3 p-4 rounded-lg bg-secondary/50">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Focus on {highPriorityWeakPoints[0]?.topic}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your lowest accuracy topic. Dedicate 30 minutes daily to this area for one week.
                      </p>
                    </div>
                  </div>
                )}
                {weakestSubject && (
                  <div className="flex gap-3 p-4 rounded-lg bg-secondary/50">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">
                        {highPriorityWeakPoints.length > 0 ? "2" : "1"}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Practice {weakestSubject.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Use the mixed exam mode to reinforce {weakestSubject.name.toLowerCase()} fundamentals.
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex gap-3 p-4 rounded-lg bg-secondary/50">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {(highPriorityWeakPoints.length > 0 ? 2 : 1) + (weakestSubject ? 1 : 0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Maintain Your Streak</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your {stats.studyStreak}-day streak is building momentum. Aim for at least one practice session
                      daily.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 p-4 rounded-lg bg-secondary/50">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {(highPriorityWeakPoints.length > 0 ? 3 : 2) + (weakestSubject ? 1 : 0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Review Explanations</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      After each practice exam, spend time reviewing explanations for incorrect answers.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-3 p-4 rounded-lg bg-secondary/50">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Start with Practice Exams</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Complete some practice exams to get personalized recommendations.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 p-4 rounded-lg bg-secondary/50">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Study Consistently</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Aim for at least 30 minutes of daily study to build and maintain knowledge.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CTA Section */}
      <Card className="bg-secondary/30">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Ready to improve?</p>
                <p className="text-sm text-muted-foreground">
                  Start a focused practice session on your weakest topics.
                </p>
              </div>
            </div>
            <Link href="/practice/exams">
              <Button className="gap-2">
                Start Targeted Practice
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function WeakPointCard({ weakPoint }: { weakPoint: WeakPointData }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-foreground">{weakPoint.topic}</h4>
              <Badge variant="outline" className="text-xs">
                {weakPoint.subjectName}
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Accuracy</span>
                  <span
                    className={`font-medium ${weakPoint.accuracy < 50 ? "text-red-500" : weakPoint.accuracy < 70 ? "text-orange-500" : "text-green-500"}`}
                  >
                    {weakPoint.accuracy}%
                  </span>
                </div>
                <Progress
                  value={weakPoint.accuracy}
                  className={`h-1.5 ${weakPoint.accuracy < 50 ? "[&>div]:bg-red-500" : weakPoint.accuracy < 70 ? "[&>div]:bg-orange-500" : ""}`}
                />
              </div>
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                {weakPoint.questionsAttempted} questions
              </p>
            </div>
            <p className="text-sm text-muted-foreground">{weakPoint.recommendation}</p>
          </div>
          <Link href={`/practice/exams/${weakPoint.subjectId}`}>
            <Button variant="outline" size="sm" className="gap-2 shrink-0 bg-transparent">
              Practice
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
