"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowLeft,
  FileText,
  Copy,
} from "lucide-react"
import { SUBJECTS } from "@lib/subjects"
import { cn } from "@lib/utils"
import { effectiveStatus, type QuestionStatus } from "@lib/question-validation"
import QuestionEditor, { type EditableQuestion } from "./question-editor"
import { useStudioActivity } from "@/components/curators/presence-beacon"
import { useUser } from "@lib/user-context"
import { toast } from "sonner"
import { answerTypeOf, formatTolerance, formatValue } from "@lib/exam/marking"

interface SubjectCounts {
  total: number
  draft: number
  review: number
  published: number
  changes?: number
}

interface TopicRow {
  topic: string
  total: number
  draft: number
  review: number
  published: number
}

interface QuestionRow extends EditableQuestion {
  id: string
  /** Has a primary Part 61 MOS item. */
  mosMapped?: boolean
}

const STATUS_STYLES: Record<QuestionStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  review: "bg-warning/15 text-warning",
  published: "bg-success/15 text-success",
  rejected: "bg-destructive/10 text-destructive",
}

const BLANK: EditableQuestion = {
  subjectId: "",
  topic: "",
  difficulty: "medium",
  questionText: "",
  imageUrl: null,
  imageAlt: null,
  answerType: "choice",
  options: ["", "", "", ""],
  correctIndex: 0,
  answerValue: null,
  answerUnit: null,
  // A typed answer that only accepts the exact value is rarely what's meant,
  // so the format switch starts at 5% when it's chosen.
  tolerance: 5,
  toleranceType: "percent",
  explanation: "",
  status: "draft",
}

export function QuestionsContent() {
  const { user } = useUser()
  const isAdmin = !!user?.isAdmin
  const [subjectId, setSubjectId] = useState("")
  const [reviewing, setReviewing] = useState(false)
  const [subjectQuery, setSubjectQuery] = useState("")
  const [counts, setCounts] = useState<Record<string, SubjectCounts>>({})
  const [loadingCounts, setLoadingCounts] = useState(true)
  const [topics, setTopics] = useState<TopicRow[]>([])
  const [totals, setTotals] = useState({ total: 0, draft: 0, review: 0, published: 0 })
  const [activeTopic, setActiveTopic] = useState<string>("all")
  const [questions, setQuestions] = useState<QuestionRow[]>([])
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [loadingQuestions, setLoadingQuestions] = useState(false)

  const [editing, setEditing] = useState<EditableQuestion | null>(null)
  /** The saved question being edited (null for new ones): decides live vs draft. */
  const [original, setOriginal] = useState<QuestionRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [serverErrors, setServerErrors] = useState<Record<string, string> | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  /**
   * Where to go when they're done. Arriving from MOS coverage means they were
   * working through one unit; dropping them in the question bank afterwards
   * loses their place in it.
   */
  const [returnTo, setReturnTo] = useState<string | null>(null)

  const subject = SUBJECTS.find((s) => s.id === subjectId)

  // Deep links from MOS coverage:
  //   ?subject=cpl-aerodynamics&new=1&mos=<itemId>  write a question for a gap
  //   ?subject=cpl-aerodynamics&edit=<questionId>   map an existing question
  const searchParams = useSearchParams()
  const router = useRouter()
  const deepLinked = useRef(false)
  useEffect(() => {
    if (deepLinked.current) return
    const target = searchParams.get("subject")
    if (!target || !SUBJECTS.some((s) => s.id === target)) return
    deepLinked.current = true
    setSubjectId(target)
    const editId = searchParams.get("edit")
    const itemId = searchParams.get("mos")
    // Captured before the URL is cleaned up, so Back and Save know the way home.
    if (itemId) setReturnTo(`/admin/mos/${target}?item=${encodeURIComponent(itemId)}`)
    router.replace("/admin/questions", { scroll: false })

    if (editId) {
      fetch(`/api/admin/questions?id=${encodeURIComponent(editId)}&pageSize=1`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => {
          const q = d.questions?.[0]
          if (!q) return toast.error("That question no longer exists")
          setOriginal(q)
          setEditing(!isAdmin && q.pendingRevision ? { ...q, ...q.pendingRevision } : q)
        })
        .catch(() => toast.error("Couldn't open that question"))
    } else if (searchParams.get("new") === "1") {
      const draft: EditableQuestion = { ...BLANK, subjectId: target }
      setEditing(draft)
      if (itemId) {
        fetch(`/api/admin/mos/items?subjectId=${encodeURIComponent(target)}&ids=${encodeURIComponent(itemId)}`)
          .then((r) => (r.ok ? r.json() : Promise.reject()))
          .then((d) => {
            const item = d.items?.[0]
            if (!item) return
            setEditing((e) =>
              e && !e.id ? { ...e, topic: e.topic || item.subtopicTitle || item.topicTitle, mos: [{ itemId: item.id, primary: true, source: "manual", confidence: null, item }] } : e,
            )
          })
          .catch(() => {})
      }
    }
  }, [searchParams, router, isAdmin])

  // Lets the admin roster say what they're on, not just that they're here.
  useStudioActivity(
    editing ? [subject?.code, editing.id ? "editing" : "new"].filter(Boolean).join(" · ") : subject?.code || null,
  )

  const filteredSubjects = useMemo(() => {
    const q = subjectQuery.trim().toLowerCase()
    if (!q) return SUBJECTS
    return SUBJECTS.filter((s) => `${s.name} ${s.code} ${s.licenseType}`.toLowerCase().includes(q))
  }, [subjectQuery])

  // Bank sizes for every subject, so the chooser shows what exists up front.
  useEffect(() => {
    let cancelled = false
    fetch("/api/admin/questions/counts")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("counts"))))
      .then((d) => {
        if (!cancelled) setCounts(d.counts ?? {})
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingCounts(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const loadTopics = useCallback(async (id: string) => {
    setLoadingTopics(true)
    try {
      const res = await fetch(`/api/admin/questions/topics?subjectId=${encodeURIComponent(id)}`)
      const data = await res.json()
      setTopics(data.topics ?? [])
      setTotals(data.totals ?? { total: 0, draft: 0, review: 0, published: 0 })
    } finally {
      setLoadingTopics(false)
    }
  }, [])

  const loadQuestions = useCallback(async (id: string, topic: string) => {
    setLoadingQuestions(true)
    try {
      const params = new URLSearchParams({ subjectId: id, pageSize: "100" })
      if (topic !== "all") params.set("topic", topic)
      const res = await fetch(`/api/admin/questions?${params}`)
      const data = await res.json()
      setQuestions(data.questions ?? [])
    } finally {
      setLoadingQuestions(false)
    }
  }, [])

  useEffect(() => {
    if (!subjectId) return
    loadTopics(subjectId)
    loadQuestions(subjectId, activeTopic)
  }, [subjectId, activeTopic, loadTopics, loadQuestions])

  async function handleSave(status: string, addAnother: boolean) {
    if (!editing) return
    setSaving(true)
    setServerErrors(undefined)

    const payload = { ...editing, status, subjectId: editing.subjectId || subjectId }
    const isNew = !editing.id

    try {
      const res = await fetch(
        isNew ? "/api/admin/questions" : `/api/admin/questions/${editing.id}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      )
      const data = await res.json()

      if (!res.ok) {
        setServerErrors(data.fieldErrors ?? { questionText: data.error || "Save failed" })
        return
      }

      if (data.revisionPending) toast.success("Changes sent for review")
      else if (!isAdmin && status === "review") toast.success("Submitted for review")

      await Promise.all([loadTopics(subjectId), loadQuestions(subjectId, activeTopic)])
      setOriginal(null)

      if (addAnother) {
        // Keeping the topic and difficulty makes writing a run of questions quick.
        setEditing({ ...BLANK, subjectId, topic: payload.topic, difficulty: payload.difficulty })
      } else if (returnTo) {
        router.push(returnTo)
      } else {
        setEditing(null)
      }
    } finally {
      setSaving(false)
    }
  }

  async function reviewAction(body: Record<string, unknown>, done: string) {
    if (!editing?.id) return
    setReviewing(true)
    try {
      const res = await fetch(`/api/admin/questions/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return toast.error(data.error || "Couldn't update the question")
      toast.success(done)
      setEditing(null)
      setOriginal(null)
      await Promise.all([loadTopics(subjectId), loadQuestions(subjectId, activeTopic)])
    } finally {
      setReviewing(false)
    }
  }

  const reviewRevision = (action: "apply-revision" | "discard-revision", reason?: string) =>
    reviewAction({ action, reason }, action === "apply-revision" ? "Changes applied" : "Proposed changes discarded")

  const sendBack = (reason: string) => reviewAction({ action: "send-back", reason }, "Sent back with your feedback")

  function openEditor(q: QuestionRow) {
    setServerErrors(undefined)
    setOriginal(q)
    // A curator picks up where their proposed edit left off.
    setEditing(!isAdmin && q.pendingRevision ? { ...q, ...q.pendingRevision } : q)
  }

  async function handleDelete() {
    if (!deleteId) return
    await fetch(`/api/admin/questions/${deleteId}`, { method: "DELETE" })
    setDeleteId(null)
    await Promise.all([loadTopics(subjectId), loadQuestions(subjectId, activeTopic)])
  }

  // --- Subject chooser -----------------------------------------------------
  if (!subjectId) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-8 p-4 lg:p-8">
        <header className="space-y-1.5">
          <h1 className="text-display-3 font-bold text-foreground">Question bank</h1>
          <p className="text-muted-foreground">
            Pick a subject to see its topics and write questions.
          </p>
        </header>

        <div className="relative max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Label htmlFor="subject-search" className="sr-only">
            Search subjects
          </Label>
          <Input
            id="subject-search"
            value={subjectQuery}
            onChange={(e) => setSubjectQuery(e.target.value)}
            placeholder="Search subjects..."
            className="h-11 pl-9"
          />
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSubjectId(s.id)}
                className="flex w-full items-start gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.licenseType.toUpperCase()} · {s.code}
                  </p>

                  {loadingCounts ? (
                    <Skeleton className="mt-2 h-4 w-24" />
                  ) : (
                    (() => {
                      const c: SubjectCounts = counts[s.id] ?? { total: 0, draft: 0, review: 0, published: 0 }
                      return (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-foreground" data-tabular>
                            <span className="font-semibold">{c.published}</span>
                            <span className="text-muted-foreground">
                              {" "}
                              published of {s.totalQuestions} planned
                            </span>
                          </p>
                          {!!c.changes && (
                            <p className="text-xs font-medium text-warning">{c.changes} with proposed changes</p>
                          )}
                          {(c.draft > 0 || c.review > 0) && (
                            <p className="text-xs text-muted-foreground" data-tabular>
                              {c.review > 0 && <span className="text-warning">{c.review} in review</span>}
                              {c.review > 0 && c.draft > 0 && " · "}
                              {c.draft > 0 && <span>{c.draft} draft</span>}
                            </p>
                          )}
                          {/* Coverage against the planned bank size. */}
                          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                c.published >= s.totalQuestions ? "bg-success" : "bg-primary",
                              )}
                              style={{
                                width: `${Math.min(100, s.totalQuestions > 0 ? (c.published / s.totalQuestions) * 100 : 0)}%`,
                              }}
                            />
                          </div>
                        </div>
                      )
                    })()
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
        {filteredSubjects.length === 0 && (
          <p className="text-sm text-muted-foreground">No subjects match that search.</p>
        )}
      </div>
    )
  }

  // --- Editor --------------------------------------------------------------
  if (editing) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 p-4 lg:p-6">
        {/* The header is one line: on a screen you write on, chrome is scroll. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Button
            variant="ghost"
            onClick={() => (returnTo ? router.push(returnTo) : setEditing(null))}
            className="-ml-2 h-9 shrink-0 gap-1.5 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {returnTo ? "Question bank" : subject?.code}
          </Button>
          <h1 className="text-lg font-semibold text-foreground">{editing.id ? "Edit question" : "New question"}</h1>
          <p className="truncate text-sm text-muted-foreground">{subject?.name}</p>
        </div>

        <QuestionEditor
          value={editing}
          onChange={setEditing}
          onSave={handleSave}
          onCancel={() => {
            setOriginal(null)
            if (returnTo) router.push(returnTo)
            else setEditing(null)
          }}
          saving={saving}
          serverErrors={serverErrors}
          knownTopics={topics.map((t) => t.topic)}
          canPublish={isAdmin}
          isLive={!!original && effectiveStatus(original.status) === "published"}
          pendingRevision={isAdmin ? original?.pendingRevision : null}
          onReviewRevision={reviewRevision}
          onSendBack={sendBack}
          inReview={!!original && original.status === "review"}
          reviewing={reviewing}
        />
      </div>
    )
  }

  // --- Subject workspace ---------------------------------------------------
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 lg:p-8">
      <Button
        variant="ghost"
        onClick={() => {
          setSubjectId("")
          setActiveTopic("all")
        }}
        className="h-9 gap-1.5 text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All subjects
      </Button>

      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-display-3 font-bold text-foreground">{subject?.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span data-tabular>{totals.total} questions</span>
            <span aria-hidden="true">·</span>
            <span className="text-success">{totals.published} published</span>
            <span aria-hidden="true">·</span>
            <span className="text-warning">{totals.review} in review</span>
            <span aria-hidden="true">·</span>
            <span>{totals.draft} draft</span>
          </div>
        </div>

        <Button
          onClick={() => {
            setServerErrors(undefined)
            setEditing({
              ...BLANK,
              subjectId,
              topic: activeTopic === "all" ? "" : activeTopic,
            })
          }}
          className="h-11 shrink-0 gap-2"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New question
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        {/* Topic coverage */}
        <aside className="space-y-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Topics
          </p>
          {loadingTopics ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 rounded-md" />
              ))}
            </div>
          ) : (
            <nav aria-label="Topics" className="space-y-0.5">
              <button
                type="button"
                onClick={() => setActiveTopic("all")}
                aria-current={activeTopic === "all" ? "true" : undefined}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                  activeTopic === "all"
                    ? "bg-primary/10 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                All topics
                <span data-tabular>{totals.total}</span>
              </button>

              {topics.map((t) => (
                <button
                  key={t.topic}
                  type="button"
                  onClick={() => setActiveTopic(t.topic)}
                  aria-current={activeTopic === t.topic ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                    activeTopic === t.topic
                      ? "bg-primary/10 font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <span className="min-w-0 truncate">{t.topic}</span>
                  {/* Thin topics are the ones an author should fill next. */}
                  <span
                    className={cn(
                      "shrink-0 tabular-nums",
                      t.published < 10 && "text-warning",
                    )}
                    data-tabular
                  >
                    {t.total}
                  </span>
                </button>
              ))}

              {topics.length === 0 && (
                <p className="px-3 py-6 text-sm text-muted-foreground">
                  No questions yet. Write the first one.
                </p>
              )}
            </nav>
          )}
        </aside>

        {/* Questions */}
        <div className="min-w-0 space-y-3">
          {loadingQuestions ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : questions.length === 0 ? (
            <Card className="border-dashed shadow-none">
              <CardContent className="p-10 text-center">
                <p className="mb-2 font-medium text-foreground">No questions here yet</p>
                <p className="mb-5 text-sm text-muted-foreground">
                  {activeTopic === "all"
                    ? "This subject has no questions."
                    : `No questions under "${activeTopic}".`}
                </p>
                <Button
                  onClick={() =>
                    setEditing({
                      ...BLANK,
                      subjectId,
                      topic: activeTopic === "all" ? "" : activeTopic,
                    })
                  }
                  className="h-10"
                >
                  Write a question
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-3">
              {questions.map((q) => {
                const status = effectiveStatus(q.status)
                return (
                  <li key={q.id}>
                    <Card className="shadow-e1 transition-shadow hover:shadow-e2">
                      <CardContent className="space-y-3 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={cn("text-xs", STATUS_STYLES[status])}>
                            {status === "review" ? "In review" : status}
                          </Badge>
                          {q.pendingRevision && (
                            <Badge variant="outline" className="border-warning/40 text-xs text-warning">
                              Changes proposed
                            </Badge>
                          )}
                          {q.mosMapped === false && (
                            <Badge variant="outline" className="border-warning/40 bg-warning/10 text-xs text-foreground">
                              No MOS link
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {q.difficulty}
                          </Badge>
                          <span className="truncate text-xs text-muted-foreground">{q.topic}</span>
                        </div>

                        <p className="line-clamp-2 text-sm text-foreground">{q.questionText}</p>

                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          Answer:{" "}
                          {answerTypeOf(q) === "numeric"
                            ? typeof q.answerValue === "number"
                              ? `${formatValue(q.answerValue, q.answerUnit)} ${formatTolerance(q)}`
                              : "—"
                            : (q.options?.[q.correctIndex] ?? "—")}
                          {q.imageUrl && <span className="ml-1.5 text-muted-foreground">· has an image</span>}
                        </p>

                        <div className="flex items-center gap-1 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 gap-1.5"
                            onClick={() => openEditor(q)}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 gap-1.5"
                            onClick={() => {
                              setServerErrors(undefined)
                              const { id, pendingRevision, pendingRevisionAt, ...rest } = q
                              setOriginal(null)
                              setEditing({ ...rest, status: "draft" })
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                            Duplicate
                          </Button>
                          {/* Curators can't remove live questions. */}
                          {(isAdmin || status !== "published") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(q.id)}
                              className="ml-auto h-9 gap-1.5 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this question?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Past exam results that referenced it are unaffected.
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
