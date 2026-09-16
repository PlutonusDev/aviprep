"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Edit, ChevronLeft, ChevronRight, UserPlus, Loader2, Check } from "lucide-react"
import { SUBJECTS } from "@lib/products"
import { cn } from "@lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader, PageShell } from "@/components/hub/page-primitives"

interface Member {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  arn: string
  isAdmin: boolean
  hasBundle: boolean
  bundleExpiry: string | null
  createdAt: string
  purchases: { subjectId: string; expiresAt: string }[]
  _count: { examAttempts: number }
}

interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function MembersContent() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  })
  const [editMember, setEditMember] = useState<Member | null>(null)
  const [saving, setSaving] = useState(false)
  const [grantAccessOpen, setGrantAccessOpen] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState("")
  const [selectedSubjectSearch, setSelectedSubjectSearch] = useState("")

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        ...(search && { search }),
      })
      const res = await fetch(`/api/admin/members?${params}`)
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members)
        setPagination((prev) => ({ ...prev, total: data.total, totalPages: data.totalPages }))
      }
    } catch (error) {
      console.error("Failed to fetch members:", error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.pageSize, search])

  useEffect(() => {
    const debounce = setTimeout(fetchMembers, 300)
    return () => clearTimeout(debounce)
  }, [fetchMembers])

  const handleSaveMember = async () => {
    if (!editMember) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/members/${editMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editMember.firstName,
          lastName: editMember.lastName,
          email: editMember.email,
          phone: editMember.phone,
          arn: editMember.arn,
          isAdmin: editMember.isAdmin,
          hasBundle: editMember.hasBundle,
        }),
      })
      if (res.ok) {
        setEditMember(null)
        fetchMembers()
      }
    } catch (error) {
      console.error("Failed to save member:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleGrantAccess = async () => {
    if (!editMember || !selectedSubject) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/members/${editMember.id}/grant-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId: selectedSubject }),
      })
      if (res.ok) {
        setGrantAccessOpen(false)
        setSelectedSubject("")
        fetchMembers()
      }
    } catch (error) {
      console.error("Failed to grant access:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell>
      <PageHeader title="Members" description={`${pagination.total.toLocaleString()} accounts`} />

      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Label htmlFor="member-search" className="sr-only">
          Search members
        </Label>
        <Input
          id="member-search"
          placeholder="Name, email or ARN"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPagination((prev) => ({ ...prev, page: 1 }))
          }}
          className="h-11 pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-e1">
        <div className="overflow-x-auto">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Member</TableHead>
                <TableHead>ARN</TableHead>
                <TableHead>Access</TableHead>
                <TableHead className="text-right">Exams</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[60px]">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-9 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    {search ? "No one matches that search." : "No members yet."}
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-foreground"
                        >
                          {`${member.firstName[0] ?? ""}${member.lastName[0] ?? ""}`.toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-medium text-foreground">
                            <span className="truncate">
                              {member.firstName} {member.lastName}
                            </span>
                            {member.isAdmin && (
                              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-[11px]">
                                Admin
                              </Badge>
                            )}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{member.arn}</TableCell>
                    <TableCell>
                      {member.hasBundle ? (
                        <Badge variant="outline" className="border-success/30 bg-success/10">
                          Bundle
                        </Badge>
                      ) : member.purchases.length > 0 ? (
                        <Badge variant="secondary">
                          {member.purchases.length} subject{member.purchases.length === 1 ? "" : "s"}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right" data-tabular>
                      {member._count.examAttempts}
                    </TableCell>
                    <TableCell className="text-muted-foreground" data-tabular>
                      {new Date(member.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditMember(member)}
                        aria-label={`Edit ${member.firstName} ${member.lastName}`}
                      >
                        <Edit className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground" data-tabular>
              {(pagination.page - 1) * pagination.pageSize + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
              {pagination.total.toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              <span className="text-sm text-muted-foreground" data-tabular>
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Member Dialog */}
      <Dialog open={!!editMember} onOpenChange={() => setEditMember(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit member</DialogTitle>
            <DialogDescription>Details, roles and access.</DialogDescription>
          </DialogHeader>
          {editMember && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    value={editMember.firstName}
                    onChange={(e) => setEditMember({ ...editMember, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    value={editMember.lastName}
                    onChange={(e) => setEditMember({ ...editMember, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editMember.email}
                  onChange={(e) => setEditMember({ ...editMember, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={editMember.phone}
                    onChange={(e) => setEditMember({ ...editMember, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="arn">ARN</Label>
                  <Input
                    id="arn"
                    value={editMember.arn}
                    onChange={(e) => setEditMember({ ...editMember, arn: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>Administrator</Label>
                  <p className="text-sm text-muted-foreground">Full access to the admin panel.</p>
                </div>
                <Switch
                  checked={editMember.isAdmin}
                  onCheckedChange={(checked) => setEditMember({ ...editMember, isAdmin: checked })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>Bundle</Label>
                  <p className="text-sm text-muted-foreground">Every subject.</p>
                </div>
                <Switch
                  checked={editMember.hasBundle}
                  onCheckedChange={(checked) => setEditMember({ ...editMember, hasBundle: checked })}
                />
              </div>

              {/* Current Access */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Subjects</Label>
                  <Button className="cursor-pointer" variant="outline" size="sm" onClick={() => setGrantAccessOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
                    Add subject
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editMember.purchases.length === 0 ? (
                    <p className="text-sm text-muted-foreground">None</p>
                  ) : (
                    editMember.purchases.map((p) => {
                      const subject = SUBJECTS.find((s) => s.id === p.subjectId)
                      return (
                        <Badge key={p.subjectId} variant="secondary">
                          {subject?.name || p.subjectId}
                        </Badge>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button className="cursor-pointer" variant="outline" onClick={() => setEditMember(null)}>
              Cancel
            </Button>
            <Button className="cursor-pointer" onClick={handleSaveMember} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grant Access Dialog */}
      <Dialog open={grantAccessOpen} onOpenChange={(open) => {
        setGrantAccessOpen(open);
        if (!open) setSelectedSubject(""); // Reset selection on close
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add a subject</DialogTitle>
            <DialogDescription>
              Gives {editMember?.firstName} 12 months of access.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject-search">Subject</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="subject-search"
                  placeholder="Name or code"
                  className="pl-8"
                  value={selectedSubjectSearch}
                  onChange={(e) => setSelectedSubjectSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-md border">
              <div className="h-[200px] overflow-y-auto">
                <div className="p-2">
                  {SUBJECTS.filter(s =>
                    s.name.toLowerCase().includes(selectedSubjectSearch.toLowerCase()) ||
                    s.code.toLowerCase().includes(selectedSubjectSearch.toLowerCase())
                  ).map((subject) => (
                    <button
                      key={subject.id}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selectedSubject === subject.id && "bg-primary/10"
                      )}
                      type="button"
                      aria-pressed={selectedSubject === subject.id}
                      onClick={() => setSelectedSubject(subject.id)}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{subject.name}</span>
                        <span className="text-xs text-muted-foreground">{subject.code}</span>
                      </div>
                      {selectedSubject === subject.id && (
                        <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                      )}
                    </button>
                  ))}
                  {SUBJECTS.filter(s =>
                    s.name.toLowerCase().includes(selectedSubjectSearch.toLowerCase()) ||
                    s.code.toLowerCase().includes(selectedSubjectSearch.toLowerCase())
                  ).length === 0 && (
                      <p className="p-4 text-center text-sm text-muted-foreground">No matches.</p>
                    )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantAccessOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGrantAccess}
              disabled={saving || !selectedSubject}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
