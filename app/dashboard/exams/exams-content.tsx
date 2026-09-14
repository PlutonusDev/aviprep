"use client"

import { useEffect, useState } from "react"
import SubjectCard from "@/components/hub/subject-card"
import { QuickActions, type QuickAction } from "@/components/hub/quick-actions"
import { useTenant } from "@lib/tenant-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { BookOpen, Shuffle, Target, Timer } from "lucide-react"
import Link from "@/components/meta/link"
import type { SubjectData } from "@lib/types"

const EXAM_ACTIONS: QuickAction[] = [
  { href: "/dashboard/exams/mixed", icon: Shuffle, title: "Mixed exam", hint: "Across every subject" },
  { href: "/dashboard/exams/timed", icon: Timer, title: "Timed exam", hint: "Real exam conditions" },
  { href: "/dashboard/insights", icon: Target, title: "Weak points", hint: "Work on what needs it", feature: "insights" },
]

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

  const { isWhitelabeled } = useTenant()

  const purchasedSubjects = subjects.filter((s) => s.isPurchased)
  // On a school portal there is nothing for a student to unlock themselves, so
  // subjects they have not been assigned are simply not shown.
  const lockedSubjects = isWhitelabeled ? [] : subjects.filter((s) => !s.isPurchased)

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-8 p-4 lg:p-8">
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
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4 lg:p-8">
      {/* Header */}
      <div>
        <h1 className="text-display-3 font-bold text-foreground">Practice Exams</h1>
        <p className="text-muted-foreground">Select a subject to start practicing or try a mixed exam</p>
      </div>

      <QuickActions actions={EXAM_ACTIONS} label="Exam modes" />

      {isWhitelabeled ? (
        <section aria-label="Your subjects" className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">
            Your subjects ({purchasedSubjects.length})
          </h2>
          {purchasedSubjects.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {purchasedSubjects.map((subject) => (
                <SubjectCard key={subject.id} subject={subject} />
              ))}
            </div>
          ) : (
            <Card className="border-dashed shadow-none">
              <CardContent className="flex flex-col items-center justify-center py-14 text-center">
                <BookOpen className="mb-4 h-10 w-10 text-muted-foreground" aria-hidden="true" />
                <p className="font-medium text-foreground">No subjects assigned yet</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Your school hasn&apos;t assigned you any subjects. They&apos;ll appear here once
                  they do.
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      ) : (
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
      )}

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
