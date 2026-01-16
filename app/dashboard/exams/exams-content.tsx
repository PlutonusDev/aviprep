"use client"

import { useEffect, useState } from "react"
import SubjectCard from "@/components/hub/subject-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { BookOpen, Shuffle, Clock, Target } from "lucide-react"
import Link from "next/link"
import type { SubjectData } from "@lib/types"

export default function ExamsContent() {
  const [subjects, setSubjects] = useState<SubjectData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSubjects() {
      try {
        const response = await fetch("/api/user/subjects")
        if (!response.ok) throw new Error("Failed to fetch subjects")
        const data = await response.json()
        setSubjects(data.subjects)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }
    fetchSubjects()
  }, [])

  const purchasedSubjects = subjects.filter((s) => s.isPurchased)
  const lockedSubjects = subjects.filter((s) => !s.isPurchased)

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
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
            <p className="text-lg font-medium text-red-500">Error loading subjects</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Practice Exams</h1>
        <p className="text-muted-foreground">Select a subject to start practicing or try a mixed exam</p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <Link href="/dashboard/exams/mixed">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Shuffle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Mixed Exam</h3>
                  <p className="text-sm text-muted-foreground">Questions from all subjects</p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <Link href="/dashboard/exams/timed">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10">
                  <Clock className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Timed Exam</h3>
                  <p className="text-sm text-muted-foreground">Simulate real exam conditions</p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <Link href="/dashboard/insights">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                  <Target className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Weak Points</h3>
                  <p className="text-sm text-muted-foreground">Focus on areas to improve</p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Subjects Tabs */}
      <Tabs defaultValue="purchased" className="space-y-4">
        <TabsList className="bg-secondary">
          <TabsTrigger value="purchased">My Subjects ({purchasedSubjects.length})</TabsTrigger>
          <TabsTrigger value="available">Available ({lockedSubjects.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="purchased" className="space-y-4">
          {purchasedSubjects.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {purchasedSubjects.map((subject) => (
                <SubjectCard key={subject.id} subject={subject} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-foreground">No subjects purchased yet</p>
                <p className="text-sm text-muted-foreground">Visit the pricing page to get access to exam content.</p>
                <Link href="/dashboard/pricing" className="mt-4">
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md">Get Access</button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="available" className="space-y-4">
          {lockedSubjects.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {lockedSubjects.map((subject) => (
                <SubjectCard key={subject.id} subject={subject} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-foreground">All subjects unlocked!</p>
                <p className="text-sm text-muted-foreground">You have access to all available theory subjects.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Exam Types Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Exam Modes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Practice</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Untimed practice with immediate feedback after each question. Perfect for learning.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Timed</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Simulates real CASA exam conditions with 90 minutes for 40 questions.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Review</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Review previously attempted questions and study explanations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
