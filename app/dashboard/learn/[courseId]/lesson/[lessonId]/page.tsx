"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Menu,
  X,
} from "lucide-react"
import { LessonContent } from "@/components/learn/lesson-content"
import { LessonSidebar } from "@/components/learn/lesson-sidebar"
import { cn } from "@lib/utils"

interface Lesson {
  id: string
  title: string
  description?: string
  contentType: string
  content: any
  estimatedMins: number
  order: number
}

interface Module {
  id: string
  title: string
  lessons: Lesson[]
}

interface CourseData {
  id: string
  title: string
  modules: Module[]
  completedLessons: string[]
  totalLessons: number
  progress: number
}

export default function LessonPage({ 
  params 
}: { 
  params: Promise<{ courseId: string; lessonId: string }> 
}) {
  const { courseId, lessonId } = use(params)
  const router = useRouter()
  const [course, setCourse] = useState<CourseData | null>(null)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    fetchLesson()
  }, [courseId, lessonId])

  const fetchLesson = async () => {
    try {
      const res = await fetch(`/api/learn/lessons/${lessonId}?courseId=${courseId}`)
      if (res.ok) {
        const data = await res.json()
        setCourse(data.course)
        setLesson(data.lesson)
      }
    } catch (error) {
      console.error("Failed to fetch lesson:", error)
    }
    setLoading(false)
  }

  const handleComplete = async () => {
    if (!lesson || !course) return
    
    setCompleting(true)
    try {
      const res = await fetch(`/api/learn/lessons/${lessonId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      })
      
      if (res.ok) {
        // Update local state
        setCourse(prev => prev ? {
          ...prev,
          completedLessons: [...prev.completedLessons, lessonId],
          progress: Math.round(((prev.completedLessons.length + 1) / prev.totalLessons) * 100),
        } : null)

        // Navigate to next lesson if available
        const next = getNextLesson()
        if (next) {
          router.push(`/dashboard/learn/${courseId}/lesson/${next.id}`)
        }
      }
    } catch (error) {
      console.error("Failed to complete lesson:", error)
    }
    setCompleting(false)
  }

  const getAllLessons = () => {
    if (!course) return []
    return course.modules.flatMap(m => m.lessons)
  }

  const getCurrentIndex = () => {
    const lessons = getAllLessons()
    return lessons.findIndex(l => l.id === lessonId)
  }

  const getPrevLesson = () => {
    const lessons = getAllLessons()
    const index = getCurrentIndex()
    return index > 0 ? lessons[index - 1] : null
  }

  const getNextLesson = () => {
    const lessons = getAllLessons()
    const index = getCurrentIndex()
    return index < lessons.length - 1 ? lessons[index + 1] : null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!course || !lesson) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-xl font-semibold">Lesson not found</h2>
        <Button className="mt-4" asChild>
          <Link href="/dashboard/learn">Back to Courses</Link>
        </Button>
      </div>
    )
  }

  const isCompleted = course.completedLessons.includes(lessonId)
  const prevLesson = getPrevLesson()
  const nextLesson = getNextLesson()
  const currentIndex = getCurrentIndex()
  const totalLessons = getAllLessons().length

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Mobile sidebar toggle */}
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 right-4 z-50 lg:hidden shadow-lg bg-transparent"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-80 transform bg-background border-r transition-transform lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <LessonSidebar
          course={course}
          currentLessonId={lessonId}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b px-4 h-12 shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/dashboard/learn/${courseId}`}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-sm font-medium truncate max-w-[200px] sm:max-w-none">
                {lesson.title}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {currentIndex + 1} / {totalLessons}
              </span>
              <Progress value={course.progress} className="w-24 h-2" />
            </div>
            {isCompleted && (
              <CheckCircle2 className="h-5 w-5 text-success" />
            )}
          </div>
        </div>

        {/* Lesson content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6">
            <LessonContent 
              lesson={lesson} 
              onComplete={handleComplete}
              isCompleted={isCompleted}
            />
          </div>
        </div>

        {/* Bottom navigation */}
        <div className="flex items-center justify-between border-t px-4 py-3 shrink-0 bg-background">
          <Button
            variant="outline"
            disabled={!prevLesson}
            asChild={!!prevLesson}
          >
            {prevLesson ? (
              <Link href={`/dashboard/learn/${courseId}/lesson/${prevLesson.id}`}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Link>
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </>
            )}
          </Button>

          {!isCompleted ? (
            <Button onClick={handleComplete} disabled={completing}>
              {completing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Mark Complete
            </Button>
          ) : nextLesson ? (
            <Button asChild>
              <Link href={`/dashboard/learn/${courseId}/lesson/${nextLesson.id}`}>
                Next Lesson
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href={`/dashboard/learn/${courseId}`}>
                Finish Course
                <CheckCircle2 className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          )}

          <Button
            variant="outline"
            disabled={!nextLesson}
            asChild={!!nextLesson}
          >
            {nextLesson ? (
              <Link href={`/dashboard/learn/${courseId}/lesson/${nextLesson.id}`}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
