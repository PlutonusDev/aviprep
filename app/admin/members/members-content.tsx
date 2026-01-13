"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Search, Edit, ChevronLeft, ChevronRight, UserPlus, Loader2 } from "lucide-react"
import { SUBJECTS } from "@lib/products"

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Members</h2>
          <p className="text-muted-foreground">Manage user accounts and access</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>All Members</CardTitle>
              <CardDescription>{pagination.total} total members</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or ARN..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPagination((prev) => ({ ...prev, page: 1 }))
                }}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>ARN</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead>Exams</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No members found
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {member.firstName} {member.lastName}
                          </span>
                          {member.isAdmin && (
                            <Badge variant="outline" className="text-xs">
                              Admin
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{member.email}</TableCell>
                      <TableCell className="font-mono text-sm">{member.arn}</TableCell>
                      <TableCell>
                        {member.hasBundle ? (
                          <Badge className="bg-primary">Bundle</Badge>
                        ) : member.purchases.length > 0 ? (
                          <Badge variant="secondary">{member.purchases.length} subjects</Badge>
                        ) : (
                          <Badge variant="outline">None</Badge>
                        )}
                      </TableCell>
                      <TableCell>{member._count.examAttempts}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button className="cursor-pointer" variant="ghost" size="icon" onClick={() => setEditMember(member)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Member Dialog */}
      <Dialog open={!!editMember} onOpenChange={() => setEditMember(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>Update member information and access</DialogDescription>
          </DialogHeader>
          {editMember && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={editMember.firstName}
                    onChange={(e) => setEditMember({ ...editMember, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
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
                  <p className="text-sm text-muted-foreground">Grant admin panel access</p>
                </div>
                <Switch
                  checked={editMember.isAdmin}
                  onCheckedChange={(checked) => setEditMember({ ...editMember, isAdmin: checked })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>Bundle Access</Label>
                  <p className="text-sm text-muted-foreground">Full access to all subjects</p>
                </div>
                <Switch
                  checked={editMember.hasBundle}
                  onCheckedChange={(checked) => setEditMember({ ...editMember, hasBundle: checked })}
                />
              </div>

              {/* Current Access */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Subject Access</Label>
                  <Button className="cursor-pointer" variant="outline" size="sm" onClick={() => setGrantAccessOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Grant Access
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editMember.purchases.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No individual subject access</p>
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
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grant Access Dialog */}
      <Dialog open={grantAccessOpen} onOpenChange={setGrantAccessOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Subject Access</DialogTitle>
            <DialogDescription>Grant {editMember?.firstName} access to a subject for 12 months</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="subject">Subject</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name} ({subject.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button className="cursor-pointer" variant="outline" onClick={() => setGrantAccessOpen(false)}>
              Cancel
            </Button>
            <Button className="cursor-pointer" onClick={handleGrantAccess} disabled={saving || !selectedSubject}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Grant Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
