"use client"

import React from "react"

import { useEffect, useState } from "react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, PageHeader, PageShell, StatTile } from "@/components/hub/page-primitives"
import { cn } from "@lib/utils"

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

  const totalStudents = schools.reduce((sum, s) => sum + s.studentCount, 0)

  return (
    <PageShell>
      <PageHeader title="Flight schools" description="School accounts and their students.">
        <Button onClick={() => setShowCreateDialog(true)} className="h-10 gap-2 self-start">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add school
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile icon={Building2} label="Schools" value={isLoading ? "–" : String(schools.length)} />
        <StatTile icon={CheckCircle} label="Active" value={isLoading ? "–" : String(schools.filter((s) => s.isActive).length)} />
        <StatTile icon={Users} label="Students" value={isLoading ? "–" : totalStudents.toLocaleString()} />
      </div>

      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Label htmlFor="school-search" className="sr-only">
          Search schools
        </Label>
        <Input id="school-search" placeholder="Search schools" value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 pl-9" />
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : schools.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={search ? "No matches" : "No schools yet"}
          description={search ? "Try a different search." : "Add a school to give it a branded portal."}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-e1">
          <div className="overflow-x-auto">
            <Table className="min-w-[820px]">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>School</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schools.map((school) => (
                  <TableRow key={school.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{school.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{school.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-foreground">{school.adminName}</p>
                      <p className="text-xs text-muted-foreground">{school.adminEmail}</p>
                    </TableCell>
                    <TableCell className="text-right" data-tabular>
                      {school.studentCount}
                      <span className="text-muted-foreground"> / {school.maxStudents}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {school.subscriptionTier}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                        <span className={cn("h-1.5 w-1.5 rounded-full", school.isActive ? "bg-success" : "bg-muted-foreground/50")} aria-hidden="true" />
                        {school.isActive ? "Active" : "Suspended"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(school.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions for ${school.name}`}>
                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <a href="/school" target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                              Open portal
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleActive(school)}>
                            {school.isActive ? (
                              <>
                                <Ban className="mr-2 h-4 w-4" aria-hidden="true" />
                                Suspend
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(school)}>
                            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a flight school</DialogTitle>
            <DialogDescription>
              The school's admin gets an email with sign-in details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">School name</Label>
                <Input
                  id="name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Sydney Flight Training"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">School email</Label>
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
                <Label htmlFor="adminEmail">Admin email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={createForm.adminEmail}
                  onChange={(e) => setCreateForm((f) => ({ ...f, adminEmail: e.target.value }))}
                  placeholder="john@flightschool.com.au"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Must already have an AviPrep account.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Plan</Label>
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
                  <Label htmlFor="maxStudents">Student limit</Label>
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
                Add school
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
