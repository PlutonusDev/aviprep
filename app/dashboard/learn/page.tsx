"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  GraduationCap,
  BookOpen,
  Clock,
  Play,
  CheckCircle2,
  Lock,
  ChevronRight,
  Loader2,
  Search,
  X,
  Filter,
} from "lucide-react"
import { LICENSE_TYPES, getSubjectsByLicense, type LicenseType } from "@lib/subjects"
import { useUser } from "@lib/user-context"
import { cn } from "@lib/utils"

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
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const initialLicense = (searchParams.get("license") as LicenseType) || "cpl"
  const initialSubject = searchParams.get("subject") || "all"
  const initialSearch = searchParams.get("q") || ""
  
  const [selectedLicense, setSelectedLicense] = useState<LicenseType>(initialLicense)
  const [selectedSubject, setSelectedSubject] = useState(initialSubject)
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const { hasAccessToSubject } = useUser()

  const availableLicenses = LICENSE_TYPES; //.filter(l => l.available)
  const subjects = getSubjectsByLicense(selectedLicense)

  // Update URL when filters change
  const updateUrl = (license: string, subject: string, query: string) => {
    const params = new URLSearchParams()
    if (license !== "cpl") params.set("license", license)
    if (subject !== "all") params.set("subject", subject)
    if (query) params.set("q", query)
    const queryString = params.toString()
    router.push(`/dashboard/learn${queryString ? `?${queryString}` : ""}`, { scroll: false })
  }

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

  // Filter courses based on search and subject
  const filteredCourses = useMemo(() => {
    let filtered = courses

    if (selectedSubject !== "all") {
      filtered = filtered.filter(c => c.subjectId === selectedSubject)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(c => 
        c.title.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        subjects.find(s => s.id === c.subjectId)?.name.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [courses, selectedSubject, searchQuery, subjects])

  // Get subject name by id
  const getSubjectName = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId)?.name || "Unknown"
  }

  // Get subject code by id
  const getSubjectCode = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId)?.code || ""
  }

  const handleLicenseChange = (license: LicenseType) => {
    setSelectedLicense(license)
    setSelectedSubject("all")
    updateUrl(license, "all", searchQuery)
  }

  const handleSubjectChange = (subject: string) => {
    setSelectedSubject(subject)
    updateUrl(selectedLicense, subject, searchQuery)
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    updateUrl(selectedLicense, selectedSubject, query)
  }

  const clearFilters = () => {
    setSelectedSubject("all")
    setSearchQuery("")
    updateUrl(selectedLicense, "all", "")
  }

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "beginner": return <Badge variant="outline" className="border-green-500/50 text-green-600 dark:text-green-400 text-xs">Beginner</Badge>
      case "intermediate": return <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 dark:text-yellow-400 text-xs">Intermediate</Badge>
      case "advanced": return <Badge variant="outline" className="border-red-500/50 text-red-600 dark:text-red-400 text-xs">Advanced</Badge>
      default: return null
    }
  }

  const stats = useMemo(() => ({
    total: courses.length,
    inProgress: courses.filter(c => c.isEnrolled && (c.progress || 0) < 100).length,
    completed: courses.filter(c => c.progress === 100).length,
  }), [courses])

  const hasActiveFilters = selectedSubject !== "all" || searchQuery.trim()

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Learn</h1>
          <p className="text-muted-foreground text-sm">
            Interactive courses to master aviation theory
          </p>
        </div>
        
        {/* Quick Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{stats.total} courses</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Play className="h-4 w-4 text-primary" />
            <span className="text-primary font-medium">{stats.inProgress} in progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-green-600 dark:text-green-400 font-medium">{stats.completed} completed</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 h-9"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* License Select */}
            <Select value={selectedLicense} onValueChange={(v) => handleLicenseChange(v as LicenseType)}>
              <SelectTrigger className="w-full sm:w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableLicenses.map((license) => (
                  <SelectItem key={license.id} value={license.id}>
                    {license.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Subject Select */}
            <Select value={selectedSubject} onValueChange={handleSubjectChange}>
              <SelectTrigger className="w-full sm:w-[200px] h-9">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.code} - {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-3">
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subject Quick Links */}
      <div className="flex flex-wrap gap-2">
        {subjects.map((subject) => {
          const count = courses.filter(c => c.subjectId === subject.id).length
          const isSelected = selectedSubject === subject.id
          
          return (
            <button
              key={subject.id}
              onClick={() => handleSubjectChange(isSelected ? "all" : subject.id)}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
              )}
            >
              <span className="font-medium">{subject.name}</span>
              {count > 0 && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-md font-semibold",
                  isSelected ? "bg-primary-foreground/20" : "bg-secondary-foreground/20"
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
        {subjects.length > 8 && (
          <span className="inline-flex items-center px-3 py-1.5 text-sm text-muted-foreground">
            +{subjects.length - 8} more
          </span>
        )}
      </div>

      {/* Course List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredCourses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
            {hasActiveFilters ? (
              <>
                <h3 className="text-lg font-semibold">No courses found</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Try adjusting your search or filters
                </p>
                <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4 bg-transparent">
                  Clear Filters
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold">No courses yet</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Courses for {LICENSE_TYPES.find(l => l.id === selectedLicense)?.fullName} are coming soon!
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredCourses.map((course) => {
            const hasAccess = hasAccessToSubject(course.subjectId)
            const subjectName = getSubjectName(course.subjectId)
            const subjectCode = getSubjectCode(course.subjectId)

            return (
              <Card
                key={course.id}
                className={cn(
                  "group transition-all hover:shadow-sm",
                  !hasAccess && "opacity-75"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Progress Indicator / Lock */}
                    <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      {!hasAccess ? (
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      ) : course.progress === 100 ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : course.isEnrolled ? (
                        <div className="relative h-8 w-8">
                          <svg className="h-8 w-8 -rotate-90">
                            <circle
                              cx="16"
                              cy="16"
                              r="14"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              className="text-muted"
                            />
                            <circle
                              cx="16"
                              cy="16"
                              r="14"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeDasharray={`${(course.progress || 0) * 0.88} 88`}
                              className="text-primary"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium">
                            {course.progress || 0}%
                          </span>
                        </div>
                      ) : (
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    {/* Course Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{course.title}</h3>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {subjectCode}
                        </Badge>
                        {getDifficultyBadge(course.difficulty)}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                        {course.description}
                      </p>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {course.totalLessons} lessons
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {course.estimatedHours}h
                        </span>
                        <Link 
                          href={`/dashboard/learn?license=${selectedLicense}&subject=${course.subjectId}`}
                          className="hover:text-primary hover:underline"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSubjectChange(course.subjectId)
                          }}
                        >
                          {subjectName}
                        </Link>
                      </div>
                    </div>

                    {/* Action */}
                    <div className="shrink-0">
                      {!hasAccess ? (
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/dashboard/pricing?license=${selectedLicense}`}>
                            <Lock className="h-4 w-4 mr-1.5" />
                            Unlock
                          </Link>
                        </Button>
                      ) : (
                        <Button size="sm" variant={course.isEnrolled ? "outline" : "default"} asChild>
                          <Link href={`/dashboard/learn/${course.id}`}>
                            {course.isEnrolled ? (
                              <>
                                Continue
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </>
                            ) : (
                              <>
                                Start
                                <Play className="h-4 w-4 ml-1" />
                              </>
                            )}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Results Count */}
      {!loading && filteredCourses.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredCourses.length} of {courses.length} courses
        </p>
      )}
    </div>
  )
}
