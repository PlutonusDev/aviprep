"use client"

import React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  GraduationCap,
  BookOpen,
  Clock,
  Play,
  CheckCircle2,
  Lock,
  ChevronRight,
  BarChart3,
  Loader2,
  Plane,
  Cloud,
  Compass,
  Scale,
  Brain,
  Calculator,
  Gauge,
} from "lucide-react"
import { LICENSE_TYPES, SUBJECTS, getSubjectsByLicense, type LicenseType } from "@lib/subjects"
import { useUser } from "@lib/user-context"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Plane,
  Cloud,
  Compass,
  Scale,
  Brain,
  Calculator,
  Gauge,
}

interface Course {
  id: string
  subjectId: string
  title: string
  description: string
  thumbnail?: string
  estimatedHours: number
  difficulty: string
  isPublished: boolean
  modules: {
    id: string
    title: string
    lessons: { id: string }[]
  }[]
  _count: {
    modules: number
  }
  totalLessons: number
  progress?: number
  isEnrolled?: boolean
  completedLessons?: number
}

export default function LearnPage() {
  const searchParams = useSearchParams()
  const initialLicense = searchParams.get("license") || "cpl"
  const [selectedLicense, setSelectedLicense] = useState<LicenseType>(initialLicense as LicenseType)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const { user, hasAccessToSubject } = useUser()

  const availableLicenses = LICENSE_TYPES.filter(l => l.available)
  const subjects = getSubjectsByLicense(selectedLicense)

  useEffect(() => {
    fetchCourses()
  }, [selectedLicense])

  const fetchCourses = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/learn/courses?license=${selectedLicense}`)
      if (res.ok) {
        const data = await res.json()
        setCourses(data.courses)
      }
    } catch (error) {
      console.error("Failed to fetch courses:", error)
    }
    setLoading(false)
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner": return "bg-green-500/10 text-green-500"
      case "intermediate": return "bg-yellow-500/10 text-yellow-500"
      case "advanced": return "bg-red-500/10 text-red-500"
      default: return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Learn</h1>
        <p className="text-muted-foreground">
          Interactive courses to master aviation theory
        </p>
      </div>

      {/* License Tabs */}
      <Tabs value={selectedLicense} onValueChange={(v) => setSelectedLicense(v as LicenseType)}>
        <TabsList className="grid w-full max-w-md" style={{ gridTemplateColumns: `repeat(${availableLicenses.length}, 1fr)` }}>
          {availableLicenses.map((license) => (
            <TabsTrigger key={license.id} value={license.id}>
              {license.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {availableLicenses.map((license) => (
          <TabsContent key={license.id} value={license.id} className="space-y-6 mt-6">
            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Available Courses</p>
                    <p className="text-2xl font-bold">{courses.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Play className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">In Progress</p>
                    <p className="text-2xl font-bold">
                      {courses.filter(c => c.isEnrolled && (c.progress || 0) < 100).length}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">
                      {courses.filter(c => c.progress === 100).length}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Course Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : courses.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No courses yet</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Courses for {license.fullName} are coming soon!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {subjects.map((subject) => {
                  const subjectCourses = courses.filter(c => c.subjectId === subject.id)
                  const hasAccess = hasAccessToSubject(subject.id)
                  const Icon = iconMap[subject.icon] || BookOpen

                  if (subjectCourses.length === 0) return null

                  return subjectCourses.map((course) => (
                    <Card key={course.id} className="group overflow-hidden transition-all hover:shadow-md">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{course.title}</CardTitle>
                            <CardDescription className="line-clamp-2">
                              {course.description}
                            </CardDescription>
                          </div>
                          <div className={`rounded-md px-2 py-1 text-xs font-medium text-foreground flex items-center justify-center bg-secondary  ${getDifficultyColor(course.difficulty)}`}>
                            {subject.name} - {course.difficulty}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4 relative">
                        {!hasAccess && (
                          <div className="absolute rounded-md mx-4 inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                            <div className="text-center">
                              <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-sm font-medium">Unlock with Learning Access</p>
                              <Button size="sm" className="mt-2" asChild>
                                <Link href={`/dashboard/pricing?license=${selectedLicense}`}>
                                  Get Access
                                </Link>
                              </Button>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4" />
                            <span>{course.totalLessons} lessons</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{course.estimatedHours}h</span>
                          </div>
                        </div>

                        {course.isEnrolled && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">{course.progress || 0}%</span>
                            </div>
                            <Progress value={course.progress || 0} className="h-2" />
                          </div>
                        )}

                        <Button
                          className="w-full"
                          variant={course.isEnrolled ? "outline" : "default"}
                          asChild
                        >
                          <Link href={`/dashboard/learn/${course.id}`}>
                            {course.isEnrolled ? (
                              <>
                                Continue Learning
                                <ChevronRight className="ml-2 h-4 w-4" />
                              </>
                            ) : (
                              <>
                                Start Course
                                <Play className="ml-2 h-4 w-4" />
                              </>
                            )}
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
