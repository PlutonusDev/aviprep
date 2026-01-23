"use client"

import React from "react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useSchool } from "../layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Search,
  UserPlus,
  MoreHorizontal,
  Mail,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Download,
  Upload,
} from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

interface Student {
  id: string
  email: string
  firstName: string
  lastName: string
  arn: string
  profilePicture: string | null
  enrolledAt: string
  examCount: number
  averageScore: number | null
  lastActive: string | null
}

const Loading = () => null

export default function StudentsPage() {
  const searchParams = useSearchParams()
  const { school, studentCount, refreshData } = useSchool()
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [addForm, setAddForm] = useState({ email: "", firstName: "", lastName: "", arn: "", phone: "" })
  const [error, setError] = useState("")

  const fetchStudents = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "20" })
      if (search) params.set("search", search)
      const res = await fetch(`/api/school/students?${params}`)
      if (res.ok) {
        const data = await res.json()
        setStudents(data.students)
        setTotalPages(data.totalPages)
      }
    } catch (error) {
      console.error("Failed to fetch students:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [page, search])

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/school/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to add student")
        return
      }

      setShowAddDialog(false)
      setAddForm({ email: "", firstName: "", lastName: "", arn: "", phone: "" })
      fetchStudents()
      refreshData()
    } catch (err) {
      setError("An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveStudent = async () => {
    if (!selectedStudent) return
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/school/students/${selectedStudent.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setShowRemoveDialog(false)
        setSelectedStudent(null)
        fetchStudents()
        refreshData()
      }
    } catch (err) {
      console.error("Failed to remove student:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!school) return null

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Students</h1>
            <p className="text-muted-foreground">
              Manage your enrolled students ({studentCount} / {school.maxStudents})
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => setShowAddDialog(true)} disabled={studentCount >= school.maxStudents}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          </div>
        </div>

        {studentCount >= school.maxStudents && (
          <Card className="border-amber-500/50 bg-amber-500/10">
            <CardContent className="flex items-center gap-3 py-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <p className="text-sm">
                You've reached your student limit. <Link href="/school/settings" className="underline">Upgrade your plan</Link> to add more students.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or ARN..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {search ? "No students match your search" : "No students enrolled yet"}
                </p>
                {!search && (
                  <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Your First Student
                  </Button>
                )}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>ARN</TableHead>
                      <TableHead className="text-center">Exams</TableHead>
                      <TableHead className="text-center">Avg Score</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={student.profilePicture || undefined} />
                              <AvatarFallback className="text-xs">
                                {student.firstName[0]}
                                {student.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {student.firstName} {student.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">{student.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{student.arn}</TableCell>
                        <TableCell className="text-center">{student.examCount}</TableCell>
                        <TableCell className="text-center">
                          {student.averageScore !== null ? (
                            <Badge variant={student.averageScore >= 70 ? "default" : "secondary"}>
                              {student.averageScore}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {student.lastActive ? (
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(student.lastActive), { addSuffix: true })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/school/students/${student.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Progress
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Mail className="mr-2 h-4 w-4" />
                                Send Message
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedStudent(student)
                                  setShowRemoveDialog(true)
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove from School
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Add Student Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Student</DialogTitle>
              <DialogDescription>
                Add an existing AviPrep user to your flight school, or create a new account.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddStudent}>
              <div className="space-y-4 py-4">
                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={addForm.firstName}
                      onChange={(e) => setAddForm((f) => ({ ...f, firstName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={addForm.lastName}
                      onChange={(e) => setAddForm((f) => ({ ...f, lastName: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={addForm.phone}
                      onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="04XX XXX XXX"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="arn">ARN</Label>
                    <Input
                      id="arn"
                      value={addForm.arn}
                      onChange={(e) => setAddForm((f) => ({ ...f, arn: e.target.value }))}
                      placeholder="6-digit number"
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Student
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Remove Student Dialog */}
        <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Student</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove {selectedStudent?.firstName} {selectedStudent?.lastName} from your flight school? They will retain their personal account but lose access to school resources.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRemoveDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleRemoveStudent} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Remove Student
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  )
}
