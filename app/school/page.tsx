"use client"

import { useEffect, useState } from "react"
import { useSchool } from "./layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Users,
  TrendingUp,
  GraduationCap,
  Clock,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  UserPlus,
} from "lucide-react"
import Link from "next/link"

interface DashboardStats {
  totalStudents: number
  activeStudents: number
  averageProgress: number
  averageScore: number
  totalExamsTaken: number
  passRate: number
  recentActivity: Array<{
    id: string
    studentName: string
    action: string
    subject: string
    score?: number
    timestamp: string
  }>
  topPerformers: Array<{
    id: string
    name: string
    score: number
    examsCompleted: number
  }>
  needsAttention: Array<{
    id: string
    name: string
    issue: string
    lastActive: string
  }>
}

export default function SchoolDashboard() {
  const { school, studentCount } = useSchool()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/school/stats")
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (!school) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {school.name}</p>
        </div>
        <Button asChild>
          <Link href="/school/students/add">
            <UserPlus className="mr-2 h-4 w-4" />
            Add Student
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{studentCount}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={(studentCount / school.maxStudents) * 100} className="h-1.5" />
              <p className="mt-1 text-xs text-muted-foreground">{school.maxStudents - studentCount} seats remaining</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Progress</p>
                <p className="text-2xl font-bold">{stats?.averageProgress ?? 0}%</p>
              </div>
              <div className="p-3 rounded-full bg-sky-500/10">
                <TrendingUp className="h-5 w-5 text-sky-500" />
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Across all enrolled students</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Score</p>
                <p className="text-2xl font-bold">{stats?.averageScore ?? 0}%</p>
              </div>
              <div className="p-3 rounded-full bg-emerald-500/10">
                <GraduationCap className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{stats?.passRate ?? 0}% pass rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Exams</p>
                <p className="text-2xl font-bold">{stats?.totalExamsTaken ?? 0}</p>
              </div>
              <div className="p-3 rounded-full bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Completed by students</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <CardDescription>Latest student exam attempts</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/school/progress">
                View All
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-full ${activity.score !== undefined && activity.score >= 70 ? "bg-emerald-500/10" : "bg-amber-500/10"}`}
                      >
                        {activity.score !== undefined && activity.score >= 70 ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{activity.studentName}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.action} - {activity.subject}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {activity.score !== undefined && (
                        <Badge variant={activity.score >= 70 ? "default" : "secondary"}>{activity.score}%</Badge>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Performers</CardTitle>
              <CardDescription>Highest scoring students</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : stats?.topPerformers && stats.topPerformers.length > 0 ? (
                <div className="space-y-3">
                  {stats.topPerformers.map((student, i) => (
                    <div key={student.id} className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.examsCompleted} exams</p>
                      </div>
                      <Badge>{student.score}%</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-sm text-muted-foreground">No data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Needs Attention */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Needs Attention</CardTitle>
              <CardDescription>Students requiring support</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : stats?.needsAttention && stats.needsAttention.length > 0 ? (
                <div className="space-y-3">
                  {stats.needsAttention.map((student) => (
                    <div key={student.id} className="flex items-center gap-3">
                      <div className="p-1.5 rounded-full bg-destructive/10">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.issue}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-emerald-500" />
                  <p>All students on track!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
