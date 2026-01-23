"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Search, Filter, TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react"
import { SUBJECTS as ALL_SUBJECTS } from "@lib/subjects"
import { useSearchParams } from "next/navigation"

interface StudentProgress {
  id: string
  firstName: string
  lastName: string
  email: string
  profilePicture: string | null
  totalExams: number
  averageScore: number | null
  passRate: number
  trend: "up" | "down" | "stable"
  lastActive: string | null
  subjectScores: Record<string, number>
}

const Loading = () => (
    <div className="flex items-center justify-center h-full">Loading</div>
)

export default function ProgressPage() {
  const [students, setStudents] = useState<StudentProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [licenseFilter, setLicenseFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("score")
  const searchParams = useSearchParams()

  useEffect(() => {
    const fetchProgress = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        if (search) params.set("search", search)
        if (licenseFilter !== "all") params.set("license", licenseFilter)
        params.set("sortBy", sortBy)

        const res = await fetch(`/api/school/progress?${params}`)
        if (res.ok) {
          const data = await res.json()
          setStudents(data.students)
        }
      } catch (error) {
        console.error("Failed to fetch progress:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchProgress()
  }, [search, licenseFilter, sortBy])

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-emerald-500" />
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Student Progress</h1>
        <p className="text-muted-foreground">Track and analyze student performance across all subjects</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={licenseFilter} onValueChange={setLicenseFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="License type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Licenses</SelectItem>
                {[{
                    name: "PPL",
                    id: "ppl",
                    available: true
                }, {
                    name: "CPL",
                    id: "cpl",
                    available: true
                }].filter((l) => l.available).map((license) => (
                  <SelectItem key={license.id} value={license.id}>
                    {license.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Average Score</SelectItem>
                <SelectItem value="exams">Exams Taken</SelectItem>
                <SelectItem value="recent">Recently Active</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Progress Grid */}
      {isLoading ? (
        <Loading />
      ) : students.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {search ? "No students match your search" : "No student progress data yet"}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {students.map((student) => (
            <Card key={student.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={student.profilePicture || undefined} />
                      <AvatarFallback>
                        {student.firstName[0]}
                        {student.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">
                        {student.firstName} {student.lastName}
                      </CardTitle>
                      <CardDescription className="text-xs">{student.email}</CardDescription>
                    </div>
                  </div>
                  {getTrendIcon(student.trend)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-muted">
                    <p className="text-lg font-bold">
                      {student.averageScore !== null ? `${student.averageScore}%` : "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Score</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted">
                    <p className="text-lg font-bold">{student.totalExams}</p>
                    <p className="text-xs text-muted-foreground">Exams</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted">
                    <p className="text-lg font-bold">{student.passRate}%</p>
                    <p className="text-xs text-muted-foreground">Pass Rate</p>
                  </div>
                </div>

                {/* Subject Progress */}
                {Object.keys(student.subjectScores).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Subject Scores</p>
                    {Object.entries(student.subjectScores)
                      .slice(0, 4)
                      .map(([subjectId, score]) => {
                        const subject = ALL_SUBJECTS.find((s) => s.id === subjectId)
                        return (
                          <div key={subjectId} className="flex items-center gap-2">
                            <span className="text-xs w-16 truncate">{subject?.code || subjectId}</span>
                            <Progress value={score} className="h-1.5 flex-1" />
                            <span className="text-xs font-medium w-8">{score}%</span>
                          </div>
                        )
                      })}
                  </div>
                )}

                <Button variant="outline" size="sm" className="w-full bg-transparent" asChild>
                  <a href={`/school/students/${student.id}`}>View Details</a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
