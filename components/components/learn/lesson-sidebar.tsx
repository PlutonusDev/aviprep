"use client"

import React from "react"

import Link from "next/link"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { 
  CheckCircle2, 
  Circle, 
  FileText,
  Video,
  HelpCircle,
  Layers,
  CreditCard,
  X,
  GraduationCap,
  ArrowLeft,
} from "lucide-react"
import { cn } from "@lib/utils"
import { Button } from "@/components/ui/button"

interface Lesson {
  id: string
  title: string
  contentType: string
  estimatedMins: number
}

interface Module {
  id: string
  title: string
  lessons: Lesson[]
}

interface Course {
  id: string
  title: string
  modules: Module[]
  completedLessons: string[]
  totalLessons: number
  progress: number
}

interface LessonSidebarProps {
  course: Course
  currentLessonId: string
  onClose?: () => void
}

const contentTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  text: FileText,
  video: Video,
  quiz: HelpCircle,
  interactive: Layers,
  flashcards: CreditCard,
}

export function LessonSidebar({ course, currentLessonId, onClose }: LessonSidebarProps) {
  return (
    <div className="flex flex-col h-full bg-sidebar overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 h-12">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm truncate">{course.title}</span>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Progress */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{course.progress}%</span>
        </div>
        <Progress value={course.progress} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2">
          {course.completedLessons.length} of {course.totalLessons} lessons completed
        </p>
      </div>

      {/* Course Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {course.modules.map((module, moduleIndex) => (
            <div key={module.id}>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {moduleIndex + 1}
                </div>
                <h3 className="text-sm font-medium truncate">{module.title}</h3>
              </div>
              
              <div className="ml-3 border-l pl-4 space-y-1">
                {module.lessons.map((lesson) => {
                  const isCompleted = course.completedLessons.includes(lesson.id)
                  const isCurrent = lesson.id === currentLessonId
                  const Icon = contentTypeIcons[lesson.contentType] || FileText

                  return (
                    <Link
                      key={lesson.id}
                      href={`/dashboard/learn/${course.id}/lesson/${lesson.id}`}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                        isCurrent && "bg-primary/10 text-primary",
                        !isCurrent && "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0" />
                      )}
                      <Icon className="h-3 w-3 shrink-0 opacity-50" />
                      <span className="truncate flex-1">{lesson.title}</span>
                      <span className="text-xs opacity-50">{lesson.estimatedMins}m</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t px-4 h-[61px]">
        <Link
          href={`/dashboard/learn/${course.id}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center h-full"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Course Overview
        </Link>
      </div>
    </div>
  )
}
