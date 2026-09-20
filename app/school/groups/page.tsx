"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, BookOpen, FolderKanban, Plus, Trash2, UserPlus, Users } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SubjectPicker } from "@/components/school/subject-picker"
import { MemberPicker } from "@/components/school/member-picker"
import { SUBJECTS } from "@lib/subjects"

interface Member {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface Group {
  id: string
  name: string
  description: string | null
  color: string
  studentIds: string[]
  subjectIds: string[]
  members: Member[]
}

interface Student {
  id: string
  firstName: string
  lastName: string
  email: string
}

const COLOURS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"]

export default function SchoolGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState(COLOURS[0])
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [subjectIds, setSubjectIds] = useState<string[]>([])
  const [editingSubjectsFor, setEditingSubjectsFor] = useState<Group | null>(null)
  const [editSubjectIds, setEditSubjectIds] = useState<string[]>([])
  const [editingMembersFor, setEditingMembersFor] = useState<Group | null>(null)
  const [editMemberIds, setEditMemberIds] = useState<string[]>([])

  async function load() {
    setLoading(true)
    try {
      const [gRes, sRes] = await Promise.all([
        fetch("/api/school/groups"),
        // The whole roster, not the table's first page: this list is what you
        // pick a group's students from.
        fetch("/api/school/students?limit=1000"),
      ])
      if (!gRes.ok) throw new Error("Could not load groups")
      const gData = await gRes.json()
      setGroups(gData.groups ?? [])
      if (sRes.ok) {
        const sData = await sRes.json()
        setStudents(sData.students ?? [])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function resetForm() {
    setName("")
    setDescription("")
    setColor(COLOURS[0])
    setMemberIds([])
    setSubjectIds([])
    setCreating(false)
  }

  async function handleCreate() {
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/school/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, color, studentIds: memberIds, subjectIds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not create the group")
      resetForm()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the group")
    } finally {
      setSaving(false)
    }
  }

  async function saveGroupSubjects() {
    if (!editingSubjectsFor) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/school/groups/${editingSubjectsFor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectIds: editSubjectIds }),
      })
      if (!res.ok) throw new Error("Could not save subjects")
      setEditingSubjectsFor(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save subjects")
    } finally {
      setSaving(false)
    }
  }

  /**
   * Sent as adds and removes rather than the whole list, so an instructor
   * editing the same group at the same moment doesn't lose their change.
   */
  async function saveGroupMembers() {
    if (!editingMembersFor) return
    setSaving(true)
    setError(null)
    try {
      const before = editingMembersFor.studentIds
      const res = await fetch(`/api/school/groups/${editingMembersFor.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          add: editMemberIds.filter((id) => !before.includes(id)),
          remove: before.filter((id) => !editMemberIds.includes(id)),
        }),
      })
      if (!res.ok) throw new Error("Could not save the students")
      setEditingMembersFor(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the students")
    } finally {
      setSaving(false)
    }
  }

  /** Which other groups each student is in, so the picker can warn about overlap. */
  function otherGroupsFor(exceptGroupId: string) {
    const map = new Map<string, { id: string; name: string; color: string }[]>()
    for (const g of groups) {
      if (g.id === exceptGroupId) continue
      for (const id of g.studentIds) {
        const list = map.get(id) ?? []
        list.push({ id: g.id, name: g.name, color: g.color })
        map.set(id, list)
      }
    }
    return map
  }

  async function handleDelete() {
    if (!deleteId) return
    await fetch(`/api/school/groups/${deleteId}`, { method: "DELETE" })
    setDeleteId(null)
    await load()
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4 lg:p-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-display-3 font-bold text-foreground">Groups</h1>
          <p className="text-muted-foreground">
            Organise students into cohorts, classes or intakes.
          </p>
        </div>
        {!creating && (
          <Button onClick={() => setCreating(true)} className="h-11 shrink-0 gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New group
          </Button>
        )}
      </header>

      {error && (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {creating && (
        <Card className="shadow-e1">
          <CardContent className="space-y-5 p-5">
            <div className="space-y-2">
              <Label htmlFor="group-name">Name</Label>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11"
                placeholder="e.g. 2026 CPL Intake"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-description">Description</Label>
              <Textarea
                id="group-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Optional"
              />
            </div>

            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium text-foreground">Colour</legend>
              <div className="flex flex-wrap gap-2">
                {COLOURS.map((c) => (
                  <label key={c} className="cursor-pointer">
                    <input
                      type="radio"
                      name="group-colour"
                      checked={color === c}
                      onChange={() => setColor(c)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      style={{ backgroundColor: c }}
                      className={`block h-8 w-8 rounded-full ring-offset-2 ring-offset-background ${
                        color === c ? "ring-2 ring-foreground" : ""
                      }`}
                    />
                    <span className="sr-only">{c}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium text-foreground">Students</legend>
              <MemberPicker
                students={students.map((s) => ({ ...s, otherGroups: otherGroupsFor("").get(s.id) ?? [] }))}
                selected={memberIds}
                onChange={setMemberIds}
                idPrefix="new-group"
              />
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium text-foreground">
                Subjects this group can see
              </legend>
              <SubjectPicker
                selected={subjectIds}
                onChange={setSubjectIds}
                idPrefix="new-group"
              />
            </fieldset>

            <div className="flex gap-3 border-t border-border pt-4">
              <Button onClick={handleCreate} disabled={saving || !name.trim()} className="h-11">
                {saving ? "Creating..." : "Create group"}
              </Button>
              <Button variant="ghost" onClick={resetForm} className="h-11">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : groups.length === 0 && !creating ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="p-10 text-center">
            <FolderKanban className="mx-auto mb-4 h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <h2 className="mb-2 font-semibold text-foreground">No groups yet</h2>
            <p className="mx-auto mb-5 max-w-sm text-sm text-muted-foreground">
              Groups let you track an intake or class together instead of student by student.
            </p>
            <Button onClick={() => setCreating(true)} className="h-10">
              Create the first group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <li key={g.id}>
              <Card className="h-full shadow-e1">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden="true"
                        style={{ backgroundColor: g.color }}
                        className="h-3 w-3 shrink-0 rounded-full"
                      />
                      <h2 className="truncate font-semibold text-foreground">{g.name}</h2>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(g.id)}
                      aria-label={`Delete ${g.name}`}
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>

                  {g.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{g.description}</p>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" aria-hidden="true" />
                      {g.members.length} {g.members.length === 1 ? "student" : "students"}
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <BookOpen className="h-3 w-3" aria-hidden="true" />
                      {(g.subjectIds ?? []).length}{" "}
                      {(g.subjectIds ?? []).length === 1 ? "subject" : "subjects"}
                    </Badge>
                  </div>

                  {(g.subjectIds ?? []).length > 0 && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {g.subjectIds
                        .map((id) => SUBJECTS.find((s) => s.id === id)?.code ?? id)
                        .join(", ")}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-9 gap-1.5"
                      onClick={() => {
                        setEditingMembersFor(g)
                        setEditMemberIds(g.studentIds)
                      }}
                    >
                      <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                      Students
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-9 gap-1.5"
                      onClick={() => {
                        setEditingSubjectsFor(g)
                        setEditSubjectIds(g.subjectIds ?? [])
                      }}
                    >
                      <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                      Subjects
                    </Button>
                  </div>

                  {g.members.length > 0 ? (
                    <ul className="space-y-0.5 text-sm text-muted-foreground">
                      {g.members.slice(0, 4).map((m) => (
                        <li key={m.id} className="truncate">
                          {m.firstName} {m.lastName}
                        </li>
                      ))}
                      {g.members.length > 4 && (
                        <li className="text-xs">+{g.members.length - 4} more</li>
                      )}
                    </ul>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMembersFor(g)
                        setEditMemberIds(g.studentIds)
                      }}
                      className="w-full rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Nobody in this group yet. Add students.
                    </button>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {editingSubjectsFor && (
        <Card className="shadow-e2">
          <CardContent className="space-y-5 p-5">
            <div>
              <h2 className="font-semibold text-foreground">
                Subjects for {editingSubjectsFor.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                Every student in this group sees these subjects, on top of anything granted to them
                individually.
              </p>
            </div>

            <SubjectPicker
              selected={editSubjectIds}
              onChange={setEditSubjectIds}
              idPrefix="edit-group"
            />

            <div className="flex gap-3 border-t border-border pt-4">
              <Button onClick={saveGroupSubjects} disabled={saving} className="h-11">
                {saving ? "Saving..." : "Save subjects"}
              </Button>
              <Button variant="ghost" onClick={() => setEditingSubjectsFor(null)} className="h-11">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editingMembersFor} onOpenChange={(open) => !open && !saving && setEditingMembersFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Students in {editingMembersFor?.name}</DialogTitle>
            <DialogDescription>
              Everyone ticked is in the group, and sees whatever subjects it grants.
            </DialogDescription>
          </DialogHeader>

          {editingMembersFor && (
            <MemberPicker
              students={students.map((s) => ({ ...s, otherGroups: otherGroupsFor(editingMembersFor.id).get(s.id) ?? [] }))}
              selected={editMemberIds}
              onChange={setEditMemberIds}
              idPrefix={`group-${editingMembersFor.id}`}
            />
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingMembersFor(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveGroupMembers} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this group?</AlertDialogTitle>
            <AlertDialogDescription>
              The group is removed. The students in it keep their accounts and progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
