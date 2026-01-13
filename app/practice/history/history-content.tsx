"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle2, XCircle, Search, Clock, ChevronDown, ChevronUp, RotateCcw, Eye, BookOpen } from "lucide-react"
import Link from "next/link"
import type { ExamHistoryItem, SubjectData } from "@lib/types"

type SortField = "date" | "score" | "subject"
type SortDirection = "asc" | "desc"

export default () => {
  const [history, setHistory] = useState<ExamHistoryItem[]>([])
  const [subjects, setSubjects] = useState<SubjectData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [subjectFilter, setSubjectFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  useEffect(() => {
    async function fetchData() {
      try {
        const [historyRes, subjectsRes] = await Promise.all([fetch("/api/user/history"), fetch("/api/user/subjects")])

        if (!historyRes.ok || !subjectsRes.ok) {
          throw new Error("Failed to fetch data")
        }

        const historyData = await historyRes.json()
        const subjectsData = await subjectsRes.json()

        setHistory(historyData.history)
        setSubjects(subjectsData.subjects)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const filteredExams = history
    .filter((exam) => {
      const matchesSearch = exam.subjectName.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesSubject = subjectFilter === "all" || exam.subjectId === subjectFilter
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "passed" && exam.passed) ||
        (statusFilter === "failed" && !exam.passed)
      return matchesSearch && matchesSubject && matchesStatus
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "date":
          comparison = new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
          break
        case "score":
          comparison = a.score - b.score
          break
        case "subject":
          comparison = a.subjectName.localeCompare(b.subjectName)
          break
      }
      return sortDirection === "asc" ? comparison : -comparison
    })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === "asc" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 lg:p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium text-red-500">Error loading history</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalExams = history.length
  const passedExams = history.filter((e) => e.passed).length
  const averageScore = totalExams > 0 ? Math.round(history.reduce((acc, e) => acc + e.score, 0) / totalExams) : 0
  const totalTime = history.reduce((acc, e) => acc + e.timeSpent, 0)
  const purchasedSubjects = subjects.filter((s) => s.isPurchased)

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Exam History</h1>
        <p className="text-muted-foreground">Review your past exam attempts and track your progress</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Exams</p>
            <p className="text-2xl font-bold text-foreground">{totalExams}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pass Rate</p>
            <p className="text-2xl font-bold text-green-500">
              {totalExams > 0 ? `${Math.round((passedExams / totalExams) * 100)}%` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Average Score</p>
            <p className="text-2xl font-bold text-foreground">{totalExams > 0 ? `${averageScore}%` : "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Time</p>
            <p className="text-2xl font-bold text-foreground">
              {Math.floor(totalTime / 60)}h {totalTime % 60}m
            </p>
          </CardContent>
        </Card>
      </div>

      {totalExams === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground">No exam history yet</p>
            <p className="text-sm text-muted-foreground">Complete some practice exams to see your history here.</p>
            <Link href="/practice/exams" className="mt-4">
              <Button>Start Practicing</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search exams..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-secondary border-0"
                  />
                </div>
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger className="w-full md:w-[180px] bg-secondary border-0">
                    <SelectValue placeholder="All Subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {purchasedSubjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[140px] bg-secondary border-0">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* History Table */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-lg">Exam Results</CardTitle>
              <CardDescription>{filteredExams.length} exams found</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="cursor-pointer hover:text-foreground" onClick={() => handleSort("subject")}>
                        <div className="flex items-center">
                          Subject
                          <SortIcon field="subject" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:text-foreground" onClick={() => handleSort("date")}>
                        <div className="flex items-center">
                          Date
                          <SortIcon field="date" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:text-foreground" onClick={() => handleSort("score")}>
                        <div className="flex items-center">
                          Score
                          <SortIcon field="score" />
                        </div>
                      </TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExams.map((exam) => (
                      <TableRow key={exam.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-8 w-8 rounded-full flex items-center justify-center ${exam.passed ? "bg-green-500/10" : "bg-red-500/10"}`}
                            >
                              {exam.passed ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                            <span className="font-medium text-foreground">{exam.subjectName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{exam.date}</TableCell>
                        <TableCell>
                          <div>
                            <span
                              className={`font-semibold ${exam.passed ? "text-green-500" : "text-red-500"}`}
                            >
                              {exam.score}%
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {exam.correctAnswers}/{exam.totalQuestions} correct
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={exam.passed ? "bg-green-500 hover:bg-green-500/80" : "bg-red-500 hover:bg-red-500/80"}
                          >
                            {exam.passed ? "Passed" : "Failed"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{exam.timeSpent}m</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" className="gap-1">
                              <Eye className="h-4 w-4" />
                              <span className="hidden sm:inline">Review</span>
                            </Button>
                            <Link href={`/practice/exams/${exam.subjectId}`}>
                              <Button variant="ghost" size="sm" className="gap-1">
                                <RotateCcw className="h-4 w-4" />
                                <span className="hidden sm:inline">Retry</span>
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
