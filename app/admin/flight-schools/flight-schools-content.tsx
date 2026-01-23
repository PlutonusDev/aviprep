"use client"

import React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Building2,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Loader2,
  Search,
  ExternalLink,
  Ban,
  CheckCircle,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

interface FlightSchool {
  id: string
  name: string
  slug: string
  email: string
  phone: string | null
  city: string | null
  state: string | null
  logo: string | null
  isActive: boolean
  maxStudents: number
  subscriptionTier: string
  subscriptionExpiry: string | null
  studentCount: number
  adminName: string
  adminEmail: string
  createdAt: string
}

export default function FlightSchoolsContent() {
  const [schools, setSchools] = useState<FlightSchool[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedSchool, setSelectedSchool] = useState<FlightSchool | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    adminEmail: "",
    subscriptionTier: "basic",
    maxStudents: 50,
  })

  const fetchSchools = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      const res = await fetch(`/api/admin/flight-schools?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSchools(data.schools)
      }
    } catch (error) {
      console.error("Failed to fetch schools:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSchools()
  }, [search])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/admin/flight-schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to create flight school")
        return
      }

      setShowCreateDialog(false)
      setCreateForm({ name: "", email: "", adminEmail: "", subscriptionTier: "basic", maxStudents: 50 })
      fetchSchools()
      toast.success("Flight school created")
    } catch (err) {
      setError("An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleActive = async (school: FlightSchool) => {
    try {
      const res = await fetch(`/api/admin/flight-schools/${school.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !school.isActive }),
      })

      if (res.ok) {
        fetchSchools()
        toast.success(school.isActive ? "School suspended" : "School activated")
      }
    } catch (error) {
      toast.error("Failed to update school")
    }
  }

  const handleDelete = async (school: FlightSchool) => {
    if (!confirm(`Are you sure you want to delete ${school.name}? This cannot be undone.`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/flight-schools/${school.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        fetchSchools()
        toast.success("Flight school deleted")
      }
    } catch (error) {
      toast.error("Failed to delete school")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Flight Schools</h1>
          <p className="text-muted-foreground">Manage flight school institution accounts</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Flight School
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Schools</p>
                <p className="text-2xl font-bold">{schools.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{schools.reduce((sum, s) => sum + s.studentCount, 0)}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Schools</p>
                <p className="text-2xl font-bold">{schools.filter((s) => s.isActive).length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schools Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search schools..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
          ) : schools.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {search ? "No schools match your search" : "No flight schools yet"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead className="text-center">Students</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {schools.map((school) => (
                  <TableRow key={school.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{school.name}</p>
                          <p className="text-xs text-muted-foreground">{school.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{school.adminName}</p>
                        <p className="text-xs text-muted-foreground">{school.adminEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {school.studentCount} / {school.maxStudents}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {school.subscriptionTier}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={school.isActive ? "default" : "secondary"}>
                        {school.isActive ? "Active" : "Suspended"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(school.createdAt), { addSuffix: true })}
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
                            <a href={`/school`} target="_blank">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View Dashboard
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedSchool(school)
                              setShowEditDialog(true)
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Settings
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleActive(school)}>
                            {school.isActive ? (
                              <>
                                <Ban className="mr-2 h-4 w-4" />
                                Suspend
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(school)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Flight School</DialogTitle>
            <DialogDescription>
              Create a new flight school institution account. The admin user will receive an email with login instructions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">School Name</Label>
                <Input
                  id="name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Sydney Flight Training"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">School Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="admin@flightschool.com.au"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Admin User Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={createForm.adminEmail}
                  onChange={(e) => setCreateForm((f) => ({ ...f, adminEmail: e.target.value }))}
                  placeholder="john@flightschool.com.au"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Must be an existing AviPrep user who will manage this school
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Subscription Tier</Label>
                  <Select
                    value={createForm.subscriptionTier}
                    onValueChange={(v) => setCreateForm((f) => ({ ...f, subscriptionTier: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxStudents">Max Students</Label>
                  <Input
                    id="maxStudents"
                    type="number"
                    value={createForm.maxStudents}
                    onChange={(e) => setCreateForm((f) => ({ ...f, maxStudents: parseInt(e.target.value) || 50 }))}
                    min={1}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create School
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
