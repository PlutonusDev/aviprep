"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Target, TrendingUp, Clock, BookOpen, Award, Flame, CheckCircle2, XCircle } from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from "recharts"
import type { SubjectData, UserStats } from "@lib/types"

interface StatsData {
  stats: UserStats
  performanceData: Array<{ date: string; score: number; count: number }>
  studyTimeData: Array<{ day: string; hours: number }>
}

export default function StatisticsContent() {
  const [statsData, setStatsData] = useState<StatsData | null>(null)
  const [subjects, setSubjects] = useState<SubjectData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, subjectsRes] = await Promise.all([fetch("/api/user/stats"), fetch("/api/user/subjects")])

        if (!statsRes.ok || !subjectsRes.ok) {
          throw new Error("Failed to fetch data")
        }

        const stats = await statsRes.json()
        const subjectsData = await subjectsRes.json()

        setStatsData(stats)
        setSubjects(subjectsData.subjects)
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
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error || !statsData) {
    return (
      <div className="p-4 lg:p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium text-red-500">Error loading statistics</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { stats, performanceData, studyTimeData } = statsData
  const purchasedSubjects = subjects.filter((s) => s.isPurchased)
  const subjectsWithScores = purchasedSubjects.filter((s) => s.averageScore > 0)

  // Build subject performance data for chart
  const subjectPerformance = subjectsWithScores.map((s) => ({
    name: s.code,
    fullName: s.name,
    score: s.averageScore,
    questions: s.questionsAttempted,
  }))

  // Check if user has any data
  const hasData = stats.totalExams > 0

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Statistics & Analytics</h1>
        <p className="text-muted-foreground">Track your progress and identify areas for improvement</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall Score</p>
                <p className="text-3xl font-bold text-foreground">{hasData ? `${stats.averageScore}%` : "—"}</p>
                {hasData && (
                  <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3" />
                    Keep practicing!
                  </p>
                )}
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pass Rate</p>
                <p className="text-3xl font-bold text-foreground">{hasData ? `${stats.passRate}%` : "—"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {hasData ? `${stats.passedExams}/${stats.totalExams} exams passed` : "No exams yet"}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Award className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Study Streak</p>
                <p className="text-3xl font-bold text-foreground">{stats.studyStreak} days</p>
                <p className="text-xs text-muted-foreground mt-1">Keep it going!</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Flame className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Study Time</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalStudyHours}h</p>
                <p className="text-xs text-muted-foreground mt-1">Total time spent</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-chart-4/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-chart-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="bg-secondary">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="subjects">By Subject</TabsTrigger>
          <TabsTrigger value="study-time">Study Time</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Score Trend</CardTitle>
              <CardDescription>Your average exam scores over time</CardDescription>
            </CardHeader>
            <CardContent>
              {performanceData.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData}>
                      <defs>
                        <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="oklch(0.65 0.18 220)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="oklch(0.65 0.18 220)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis domain={[50, 100]} stroke="var(--muted-foreground)" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "var(--foreground)" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="oklch(0.65 0.18 220)"
                        strokeWidth={2}
                        fill="url(#scoreGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Complete some exams to see your score trend</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Question Stats */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Questions Breakdown</CardTitle>
                <CardDescription>Your answer accuracy</CardDescription>
              </CardHeader>
              <CardContent>
                {hasData ? (
                  <>
                    <div className="flex items-center justify-center">
                      <div className="relative h-[200px] w-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: "Correct", value: stats.correctAnswers },
                                { name: "Incorrect", value: stats.questionsAnswered - stats.correctAnswers },
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              <Cell fill="var(--success)" />
                              <Cell fill="var(--red-500)" />
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "var(--card)",
                                border: "1px solid var(--border)",
                                borderRadius: "8px",
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{stats.correctAnswers}</p>
                          <p className="text-xs text-muted-foreground">Correct</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-500" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {stats.questionsAnswered - stats.correctAnswers}
                          </p>
                          <p className="text-xs text-muted-foreground">Incorrect</p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-[200px] flex items-center justify-center">
                    <p className="text-muted-foreground">No questions answered yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Exam Summary</CardTitle>
                <CardDescription>Your exam completion statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Exams</span>
                    <span className="text-lg font-bold text-foreground">{stats.totalExams}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Passed</span>
                    <span className="text-lg font-bold text-green-500">{stats.passedExams}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Failed</span>
                    <span className="text-lg font-bold text-red-500">{stats.totalExams - stats.passedExams}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Questions Answered</span>
                    <span className="text-lg font-bold text-foreground">{stats.questionsAnswered}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subjects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Subject</CardTitle>
              <CardDescription>Average scores across all theory subjects</CardDescription>
            </CardHeader>
            <CardContent>
              {subjectPerformance.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectPerformance} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={12} width={50} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number, name: string, props: { payload?: { fullName?: string } }) => [
                          `${value}%`,
                          props.payload?.fullName || name,
                        ]}
                      />
                      <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                        {subjectPerformance.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.score >= 80
                                ? "var(--success)"
                                : entry.score >= 70
                                  ? "var(--primary)"
                                  : "var(--warning)"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Complete some exams to see subject performance</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subject Cards */}
          {purchasedSubjects.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {purchasedSubjects.map((subject) => (
                <Card key={subject.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{subject.code}</Badge>
                        <span className="text-sm font-medium text-foreground">{subject.name}</span>
                      </div>
                      <span
                        className={`text-lg font-bold ${
                          subject.averageScore >= 80
                            ? "text-green-500"
                            : subject.averageScore >= 70
                              ? "text-primary"
                              : subject.averageScore > 0
                                ? "text-orange-500"
                                : "text-muted-foreground"
                        }`}
                      >
                        {subject.averageScore > 0 ? `${subject.averageScore}%` : "—"}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{subject.progress}%</span>
                      </div>
                      <Progress value={subject.progress} className="h-1.5" />
                      <p className="text-xs text-muted-foreground">
                        {subject.questionsAttempted}/{subject.totalQuestions} questions attempted
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="study-time" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Study Time</CardTitle>
              <CardDescription>Hours spent studying each day this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={studyTimeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`${value}h`, "Study Time"]}
                    />
                    <Bar dataKey="hours" fill="oklch(0.65 0.18 220)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Study Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-bold text-foreground">{stats.totalStudyHours}h</p>
                <p className="text-sm text-muted-foreground">Total Study Time</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-bold text-foreground">
                  {stats.totalExams > 0 ? Math.round(stats.totalStudyHours / stats.totalExams) : 0}h
                </p>
                <p className="text-sm text-muted-foreground">Avg. per Exam</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-bold text-foreground">{stats.studyStreak}</p>
                <p className="text-sm text-muted-foreground">Day Streak</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
