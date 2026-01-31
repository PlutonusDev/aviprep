"use client"

import { useState, useEffect, use, useCallback, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PanelLeftOpen,
  PanelLeftClose,
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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const startTimeRef = useRef<number>(Date.now())
  const timeSpentRef = useRef<number>(0)

  useEffect(() => {
    startTimeRef.current = Date.now()
    
    // Update time every minute for long sessions
    const interval = setInterval(() => {
      timeSpentRef.current = Math.floor((Date.now() - startTimeRef.current) / 1000)
    }, 60000)

    return () => {
      clearInterval(interval)
      // Calculate final time when leaving
      timeSpentRef.current = Math.floor((Date.now() - startTimeRef.current) / 1000)
    }
  }, [lessonId])

  useEffect(() => {
    fetchLesson()
  }, [courseId, lessonId])
  
  const fetchLesson = useCallback(async () => {
    try {
      const res = await fetch(`/api/learn/lessons/${lessonId}?courseId=${courseId}`)
      if (res.ok) {
        const data = await res.json()
        setCourse(data.course)
        setLesson(data.lesson)
      }
    } catch (error) {
      console.error("Failed to fetch lesson:", error)
    } finally {
      setLoading(false)
    }
  }, [courseId, lessonId])

  // Keyboard shortcut (Ctrl+B or Cmd+B) to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault()
        setSidebarOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const getAllLessons = () => course?.modules.flatMap(m => m.lessons) || []
  const getCurrentIndex = () => getAllLessons().findIndex(l => l.id === lessonId)
  
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

  const handleComplete = async () => {
    if (!lesson || !course) return
    
    // Calculate time spent
    const timeSpentSecs = Math.floor((Date.now() - startTimeRef.current) / 1000)
    
    setCompleting(true)
    try {
      const res = await fetch(`/api/learn/lessons/${lessonId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, timeSpentSecs }),
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
    <div className="relative flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Sidebar Logic:
          - Mobile: Fixed position, slides over content.
          - Desktop (lg): Relative position, occupies space (w-80) when open, w-0 when closed.
      */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 transform bg-sidebar transition-all duration-300 ease-in-out lg:relative lg:z-0 border-r",
          sidebarOpen 
            ? "translate-x-0 w-80" 
            : "-translate-x-full lg:translate-x-0 lg:w-0 lg:border-none"
        )}
      >
        <div className={cn(
          "h-full w-80 transition-opacity duration-300",
          !sidebarOpen && "lg:opacity-0 lg:pointer-events-none"
        )}>
          <LessonSidebar
            course={course}
            currentLessonId={lessonId}
          />
        </div>
      </aside>

      {/* Mobile Overlay (Only visible when sidebar is open on small screens) */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content area: Flex-1 ensures it fills all remaining space */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Navigation */}
        <header className="flex items-center justify-between border-b px-4 h-12 shrink-0 bg-background/95 backdrop-blur">
          <div className="flex items-center gap-2 overflow-hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="shrink-0 hover:bg-primary/10 hover:text-primary"
              title="Toggle Sidebar (Ctrl+B)"
            >
              {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
            </Button>

            <div className="h-4 w-[1px] bg-border mx-1 hidden sm:block" />

            <h1 className="text-sm font-semibold truncate text-foreground">
              {lesson.title}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Lesson {currentIndex + 1} of {totalLessons}
              </span>
              <Progress value={course.progress} className="w-20 h-1.5" />
            </div>
            {isCompleted && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase">Completed</span>
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6 lg:p-10">
            <LessonContent 
              lesson={lesson} 
              onComplete={handleComplete}
              isCompleted={isCompleted}
            />
          </div>
        </div>

        {/* Bottom Navigation Bar */}
        <footer className="flex items-center justify-between border-t px-4 py-3 shrink-0 bg-background/95">
          <Button
            variant="outline"
            size="sm"
            disabled={!prevLesson}
            asChild={!!prevLesson}
            className="h-9 px-4 bg-transparent"
          >
            {prevLesson ? (
              <Link href={`/dashboard/learn/${courseId}/lesson/${prevLesson.id}`}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Prev
              </Link>
            ) : (
              <div className="flex items-center">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Prev
              </div>
            )}
          </Button>

          <div className="flex items-center gap-2">
            {!isCompleted ? (
              <Button 
                onClick={handleComplete} 
                disabled={completing}
                className="h-9 px-6 bg-primary shadow-sm hover:shadow-md transition-all"
              >
                {completing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Mark Complete
              </Button>
            ) : nextLesson ? (
              <Button asChild className="h-9 px-6">
                <Link href={`/dashboard/learn/${courseId}/lesson/${nextLesson.id}`}>
                  Next Lesson
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            ) : (
              <Button asChild variant="secondary" className="h-9 px-6">
                <Link href={`/dashboard/learn/${courseId}`}>
                  Finish Course
                </Link>
              </Button>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={!nextLesson}
            asChild={!!nextLesson}
            className="h-9 px-4 bg-transparent"
          >
            {nextLesson ? (
              <Link href={`/dashboard/learn/${courseId}/lesson/${nextLesson.id}`}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Link>
            ) : (
              <div className="flex items-center">
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </div>
            )}
          </Button>
        </footer>
      </main>
    </div>
  )
}
