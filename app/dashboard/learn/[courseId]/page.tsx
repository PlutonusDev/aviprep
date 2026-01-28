"use client"

import React from "react"

import { useState, useEffect, use } from "react"
import Link from "@/components/meta/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { 
  ArrowLeft,
  BookOpen, 
  Clock, 
  Play, 
  CheckCircle2,
  Circle,
  PlayCircle,
  FileText,
  Video,
  HelpCircle,
  Layers,
  CreditCard,
  Loader2,
  ChevronRight,
} from "lucide-react"
import { useUser } from "@lib/user-context"

interface Lesson {
  id: string
  title: string
  description?: string
  contentType: string
  estimatedMins: number
  order: number
}

interface Module {
  id: string
  title: string
  description?: string
  order: number
  lessons: Lesson[]
}

interface Course {
  id: string
  subjectId: string
  title: string
  description: string
  estimatedHours: number
  difficulty: string
  modules: Module[]
  totalLessons: number
  progress: number
  isEnrolled: boolean
  completedLessons: string[]
  currentLesson?: string
}

const contentTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  text: FileText,
  video: Video,
  quiz: HelpCircle,
  interactive: Layers,
  flashcards: CreditCard,
}

export default function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params)
  const router = useRouter()
  const { hasAccessToSubject } = useUser()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)

  useEffect(() => {
    fetchCourse()
  }, [courseId])

  const fetchCourse = async () => {
    try {
      const res = await fetch(`/api/learn/courses/${courseId}`)
      if (res.ok) {
        const data = await res.json()
        setCourse(data.course)
      }
    } catch (error) {
      console.error("Failed to fetch course:", error)
    }
    setLoading(false)
  }

  const handleEnroll = async () => {
    setEnrolling(true)
    try {
      const res = await fetch(`/api/learn/courses/${courseId}/enroll`, {
        method: "POST",
      })
      if (res.ok) {
        fetchCourse()
      }
    } catch (error) {
      console.error("Failed to enroll:", error)
    }
    setEnrolling(false)
  }

  const getNextLesson = () => {
    if (!course) return null
    for (const module of course.modules) {
      for (const lesson of module.lessons) {
        if (!course.completedLessons.includes(lesson.id)) {
          return lesson
        }
      }
    }
    return course.modules[0]?.lessons[0] || null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Course not found</h2>
        <p className="text-muted-foreground mt-1">This course may have been removed or is not available.</p>
        <Button className="mt-4" asChild>
          <Link href="/dashboard/learn">Back to Courses</Link>
        </Button>
      </div>
    )
  }

  const hasAccess = hasAccessToSubject(course.subjectId)
  const nextLesson = getNextLesson()

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/learn">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
          <p className="text-muted-foreground">{course.description}</p>
        </div>
      </div>

      {/* Course Overview */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Card */}
          {course.isEnrolled && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Your Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {course.completedLessons.length} / {course.totalLessons} lessons
                  </span>
                </div>
                <Progress value={course.progress} className="h-2" />
                <div className="mt-4 flex gap-2">
                  {nextLesson && (
                    <Button asChild>
                      <Link href={`/dashboard/learn/${courseId}/lesson/${nextLesson.id}`}>
                        {course.completedLessons.length > 0 ? "Continue Learning" : "Start Course"}
                        <Play className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Course Content */}
          <Card>
            <CardHeader>
              <CardTitle>Course Content</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" defaultValue={course.modules.map(m => m.id)} className="space-y-2">
                {course.modules.map((module, moduleIndex) => {
                  const completedInModule = module.lessons.filter(l => 
                    course.completedLessons.includes(l.id)
                  ).length

                  return (
                    <AccordionItem key={module.id} value={module.id} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 text-left">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                            {moduleIndex + 1}
                          </div>
                          <div>
                            <p className="font-medium">{module.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {completedInModule} / {module.lessons.length} lessons
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-1 pt-2">
                          {module.lessons.map((lesson) => {
                            const isCompleted = course.completedLessons.includes(lesson.id)
                            const Icon = contentTypeIcons[lesson.contentType] || FileText

                            return (
                              <Link
                                key={lesson.id}
                                href={hasAccess ? `/dashboard/learn/${courseId}/lesson/${lesson.id}` : "#"}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                                  hasAccess 
                                    ? "hover:bg-muted cursor-pointer" 
                                    : "opacity-50 cursor-not-allowed"
                                }`}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                                ) : (
                                  <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                                )}
                                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="flex-1">{lesson.title}</span>
                                <span className="text-xs text-muted-foreground">
                                  {lesson.estimatedMins} min
                                </span>
                              </Link>
                            )
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Duration</span>
                <span className="text-sm font-medium flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {course.estimatedHours} hours
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Lessons</span>
                <span className="text-sm font-medium flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  {course.totalLessons}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Difficulty</span>
                <Badge variant="outline" className="capitalize">{course.difficulty}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Modules</span>
                <span className="text-sm font-medium">{course.modules.length}</span>
              </div>

              {!hasAccess && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-3">
                    Get access to this course with a learning subscription
                  </p>
                  <Button className="w-full" asChild>
                    <Link href="/dashboard/pricing">Get Access</Link>
                  </Button>
                </div>
              )}

              {hasAccess && !course.isEnrolled && (
                <div className="pt-4 border-t">
                  <Button className="w-full" onClick={handleEnroll} disabled={enrolling}>
                    {enrolling ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Start Course
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
