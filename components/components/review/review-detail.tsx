"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { formatDistanceToNowStrict } from "date-fns"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  CornerUpLeft,
  ExternalLink,
  FileText,
  GraduationCap,
  HelpCircle,
  Loader2,
  ShieldCheck,
  Star,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { mosId, type MosLink } from "@lib/mos/subjects"
import { cn } from "@lib/utils"
import { PersonChip, ReviewThread } from "./review-thread"
import type { ContentType, FieldChange, LessonBody, QuestionBody, ReviewAction, ReviewDetail } from "./types"

export const TYPE_META: Record<ContentType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  question: { label: "Question", icon: HelpCircle },
  lesson: { label: "Lesson", icon: FileText },
  course: { label: "Course", icon: GraduationCap },
}

const NOTE_MIN = 10

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  )
}

/* --- Content renderers ----------------------------------------------------------- */

function QuestionView({ q }: { q: QuestionBody }) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-md bg-muted px-2 py-0.5 font-medium text-foreground">{q.topic || "No topic"}</span>
        <span className="capitalize">{q.difficulty}</span>
      </div>
      <p className="whitespace-pre-line text-base font-medium leading-relaxed text-foreground">{q.questionText}</p>
      <ol className="space-y-2">
        {q.options.map((option, i) => {
          const correct = i === q.correctIndex
          return (
            <li
              key={i}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm",
                correct ? "border-success/40 bg-success/10 text-foreground" : "border-border text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  correct ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {correct ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : String.fromCharCode(65 + i)}
              </span>
              <span className="pt-0.5">
                {option}
                {correct && <span className="sr-only"> (correct answer)</span>}
              </span>
            </li>
          )
        })}
      </ol>
      <div className="space-y-1 border-t border-border pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Explanation</p>
        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{q.explanation || "No explanation."}</p>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reference</p>
        <p className={cn("text-sm", q.reference ? "text-foreground" : "text-warning")}>{q.reference || "No reference given"}</p>
      </div>
    </div>
  )
}

function LessonView({ lesson }: { lesson: LessonBody }) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-md bg-muted px-2 py-0.5 font-medium capitalize text-foreground">{lesson.contentType}</span>
        <span>{lesson.estimatedMins} min</span>
      </div>
      <p className="text-base font-semibold text-foreground">{lesson.title}</p>
      {lesson.description && <p className="text-sm text-muted-foreground">{lesson.description}</p>}
      {lesson.html ? (
        <div
          className="prose prose-sm max-h-[28rem] max-w-none overflow-y-auto rounded-lg border border-border bg-background p-4 dark:prose-invert"
          // Sanitised on the server (lib/sanitize-html.ts).
          dangerouslySetInnerHTML={{ __html: lesson.html || "<p><em>No content yet.</em></p>" }}
        />
      ) : (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {lesson.summary}. Open it in the editor to see everything.
        </p>
      )}
    </div>
  )
}

function Changes({ changes }: { changes: FieldChange[] }) {
  if (!changes.length) {
    return <p className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">No field changes. The proposal matches what’s live.</p>
  }
  return (
    <ul className="space-y-3">
      {changes.map((c) => (
        <li key={c.field} className="overflow-hidden rounded-xl border border-border">
          <p className="border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</p>
          <div className="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
            <div className="p-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-destructive">Live now</p>
              <p className="max-h-64 overflow-y-auto whitespace-pre-line text-sm text-muted-foreground line-through decoration-destructive/40">
                {c.before || "(empty)"}
              </p>
            </div>
            <div className="bg-success/5 p-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-success">Proposed</p>
              <p className="max-h-64 overflow-y-auto whitespace-pre-line text-sm text-foreground">{c.after || "(empty)"}</p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

function MosList({ links, required }: { links: MosLink[]; required: boolean }) {
  const hasPrimary = links.some((l) => l.primary && !l.item?.retired)
  return (
    <div className="space-y-2">
      {required && !hasPrimary && (
        <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          No primary MOS item. It can’t be approved until one is linked in the editor.
        </p>
      )}
      {links.length === 0 ? (
        !required && <p className="text-sm text-muted-foreground">No MOS links.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {links.map((l) => (
            <li key={l.itemId} className="flex items-start gap-3 px-3 py-2.5">
              <Star
                className={cn("mt-0.5 h-4 w-4 shrink-0", l.primary ? "fill-primary text-primary" : "text-muted-foreground/40")}
                aria-label={l.primary ? "Primary" : "Secondary"}
              />
              <div className="min-w-0 text-sm">
                <p className="font-mono text-xs font-semibold text-foreground">{l.item ? mosId(l.item.unitCode, l.item.ref) : l.itemId}</p>
                <p className="mt-0.5 line-clamp-2 text-muted-foreground">{l.item?.fullText}</p>
                {l.needsReview && <p className="mt-1 text-xs text-warning">Flagged by a MOS update</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* --- Decision bar ----------------------------------------------------------------- */

function DecisionBar({ detail, onDecided }: { detail: ReviewDetail; onDecided: (detail: ReviewDetail, action: ReviewAction) => void }) {
  const [note, setNote] = useState("")
  const [points, setPoints] = useState<1 | 3>(detail.question?.current.points === 3 ? 3 : 1)
  const [busy, setBusy] = useState<ReviewAction | null>(null)
  const recipient = (detail.kind === "edit" ? detail.proposer : detail.author)?.name.split(" ")[0]
  const noteOk = note.trim().length >= NOTE_MIN
  const isNewQuestion = detail.type === "question" && detail.kind === "new"
  const rejectNeedsNote = detail.kind === "new"

  useEffect(() => {
    setNote("")
    setPoints(detail.question?.current.points === 3 ? 3 : 1)
  }, [detail.type, detail.id, detail.question?.current.points])

  async function act(action: ReviewAction) {
    setBusy(action)
    try {
      const res = await fetch(`/api/admin/review/${detail.type}/${detail.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, message: note, points: isNewQuestion ? points : undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return toast.error(data.error || "That didn't go through.")
      setNote("")
      onDecided(data.detail, action)
    } finally {
      setBusy(null)
    }
  }

  const approveLabel = detail.kind === "edit" ? "Approve changes" : "Approve and publish"

  return (
    <div className="space-y-3 border-t border-border bg-card/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:px-6">
      <label htmlFor="review-note" className="sr-only">
        Note to {recipient ?? "the author"}
      </label>
      <Textarea
        id="review-note"
        rows={2}
        maxLength={2000}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={`Note to ${recipient ?? "the author"}. Needed to request changes${rejectNeedsNote ? " or reject" : ""}.`}
        className="resize-none bg-background"
      />
      <div className="flex flex-wrap items-center gap-2">
        {isNewQuestion && (
          <div role="radiogroup" aria-label="Royalty points" className="flex h-10 items-center rounded-lg border border-border bg-muted/40 p-1">
            {([1, 3] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={points === p}
                onClick={() => setPoints(p)}
                title={p === 3 ? "Complex: charts, multi-step calculations or images" : "Standard question"}
                className={cn(
                  "flex h-full items-center gap-1.5 rounded-md px-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  points === p ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p === 1 ? "Standard" : "Complex"}
                <span className="rounded bg-muted px-1.5 text-xs tabular-nums">{p}</span>
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            className="h-10 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={!!busy || (rejectNeedsNote && !noteOk)}
            onClick={() => act("reject")}
          >
            {busy === "reject" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}
            Reject
          </Button>
          <Button variant="outline" className="h-10 gap-1.5" disabled={!!busy || !noteOk} onClick={() => act("request-changes")}>
            {busy === "request-changes" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CornerUpLeft className="h-4 w-4" aria-hidden="true" />}
            Request changes
          </Button>
          <Button className="h-10 gap-1.5" disabled={!!busy} onClick={() => act("approve")}>
            {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
            {approveLabel}
          </Button>
        </div>
      </div>
      {note.trim().length > 0 && !noteOk && (
        <p className="text-xs text-muted-foreground">A little more detail, please. At least {NOTE_MIN} characters.</p>
      )}
    </div>
  )
}

/* --- The pane --------------------------------------------------------------------- */

function StatusBanner({ detail }: { detail: ReviewDetail }) {
  if (detail.inQueue) return null
  const tone =
    detail.status === "rejected"
      ? { icon: XCircle, cls: "border-destructive/30 bg-destructive/5", text: "Rejected. It's no longer waiting for review." }
      : detail.changesRequested
        ? { icon: CornerUpLeft, cls: "border-warning/40 bg-warning/10", text: "Changes requested. It's back with its author." }
        : detail.live || detail.status === "published"
          ? { icon: CheckCircle2, cls: "border-success/30 bg-success/10", text: "Live. Nothing waiting for review." }
          : { icon: Clock, cls: "border-border bg-muted/40", text: "Not waiting for review." }
  const Icon = tone.icon
  return (
    <p className={cn("flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm text-foreground", tone.cls)}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {tone.text}
    </p>
  )
}

export function ReviewDetailPane({
  detail,
  onChange,
  onDecided,
  onBack,
}: {
  detail: ReviewDetail
  onChange: (detail: ReviewDetail) => void
  onDecided: (detail: ReviewDetail, action: ReviewAction) => void
  onBack?: () => void
}) {
  const meta = TYPE_META[detail.type]
  const Icon = meta.icon
  const proposerDiffers = detail.proposer && detail.proposer.id !== detail.author?.id
  const needsMos = detail.kind === "new" && detail.type === "question"
  const [view, setView] = useState<"changes" | "proposed" | "live">("changes")

  useEffect(() => setView("changes"), [detail.type, detail.id])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <header className="space-y-4 border-b border-border px-4 py-5 sm:px-6">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 h-9 gap-1.5 text-muted-foreground lg:hidden">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Queue
            </Button>
          )}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <p className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-foreground">
                  <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  {detail.kind === "edit" ? `Edit to live ${meta.label.toLowerCase()}` : `New ${meta.label.toLowerCase()}`}
                </span>
                <span>{detail.subjectName}</span>
                {detail.lesson && (
                  <>
                    <span aria-hidden="true">·</span>
                    <Link href={`/admin/courses/${detail.lesson.course.id}`} className="hover:text-foreground hover:underline">
                      {detail.lesson.course.title}
                    </Link>
                  </>
                )}
              </p>
              <h2 className="font-heading text-xl font-bold leading-snug text-foreground text-balance">{detail.title}</h2>
            </div>
            <Button asChild variant="outline" size="sm" className="h-9 gap-1.5">
              <Link href={detail.editHref}>
                Open in editor
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <dt className="text-xs text-muted-foreground">Written by</dt>
              <dd>
                <PersonChip person={detail.author} size="md" showCredentials />
              </dd>
            </div>
            {proposerDiffers && (
              <div className="space-y-1.5">
                <dt className="text-xs text-muted-foreground">{detail.kind === "edit" ? "Edit proposed by" : "Submitted by"}</dt>
                <dd>
                  <PersonChip person={detail.proposer} size="md" showCredentials />
                </dd>
              </div>
            )}
            <div className="space-y-1.5">
              <dt className="text-xs text-muted-foreground">Waiting</dt>
              <dd className="flex h-9 items-center gap-1.5 text-sm text-foreground">
                <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                {detail.submittedAt ? formatDistanceToNowStrict(new Date(detail.submittedAt)) : "—"}
              </dd>
            </div>
          </dl>

          <StatusBanner detail={detail} />
        </header>

        <div className="space-y-8 px-4 py-6 sm:px-6">
          {/* Questions */}
          {detail.question &&
            (detail.kind === "edit" && detail.question.proposed ? (
              <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
                <TabsList>
                  <TabsTrigger value="changes">What changed ({detail.changes.length})</TabsTrigger>
                  <TabsTrigger value="proposed">Proposed</TabsTrigger>
                  <TabsTrigger value="live">Live now</TabsTrigger>
                </TabsList>
                <TabsContent value="changes" className="mt-4">
                  <Changes changes={detail.changes} />
                </TabsContent>
                <TabsContent value="proposed" className="mt-4">
                  <QuestionView q={detail.question.proposed} />
                </TabsContent>
                <TabsContent value="live" className="mt-4">
                  <QuestionView q={detail.question.current} />
                </TabsContent>
              </Tabs>
            ) : (
              <Section title="Question">
                <QuestionView q={detail.question.current} />
              </Section>
            ))}

          {(detail.question?.proposed?.authorNote || (detail.kind === "new" && detail.question?.current.authorNote)) && (
            <Section title="Note from the author">
              <p className="whitespace-pre-line rounded-lg bg-primary/10 px-4 py-3 text-sm text-foreground">
                {detail.question?.proposed?.authorNote || detail.question?.current.authorNote}
              </p>
            </Section>
          )}

          {/* Lessons */}
          {detail.lesson &&
            (detail.lesson.proposed ? (
              <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
                <TabsList>
                  <TabsTrigger value="changes">What changed ({detail.changes.length})</TabsTrigger>
                  <TabsTrigger value="proposed">Proposed</TabsTrigger>
                  <TabsTrigger value="live">Live now</TabsTrigger>
                </TabsList>
                <TabsContent value="changes" className="mt-4">
                  <Changes changes={detail.changes.filter((c) => c.field !== "content")} />
                  {detail.changes.some((c) => c.field === "content") && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      The lesson content changed too. Compare the <button type="button" className="font-medium text-primary hover:underline" onClick={() => setView("proposed")}>proposed</button> and{" "}
                      <button type="button" className="font-medium text-primary hover:underline" onClick={() => setView("live")}>live</button> versions.
                    </p>
                  )}
                </TabsContent>
                <TabsContent value="proposed" className="mt-4">
                  <LessonView lesson={detail.lesson.proposed} />
                </TabsContent>
                <TabsContent value="live" className="mt-4">
                  <LessonView lesson={detail.lesson.current} />
                </TabsContent>
              </Tabs>
            ) : (
              <Section title="Lesson">
                <LessonView lesson={detail.lesson.current} />
              </Section>
            ))}

          {/* Courses */}
          {detail.course && detail.kind === "edit" && (
            <Section title="What changed">
              <Changes changes={detail.changes} />
            </Section>
          )}
          {detail.course && detail.kind !== "edit" && (
            <>
              <Section title="Course">
                <div className="space-y-2 rounded-xl border border-border bg-card p-4 sm:p-5">
                  <p className="text-sm leading-relaxed text-foreground">{detail.course.current.description || "No description."}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {detail.course.current.difficulty} · about {detail.course.current.estimatedHours} h
                  </p>
                </div>
              </Section>
              <Section
                title="Lessons"
                aside={
                  detail.course.missingMos > 0 ? (
                    <span className="text-xs font-medium text-warning">{detail.course.missingMos} without a MOS link</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium text-success">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      All linked to the MOS
                    </span>
                  )
                }
              >
                {detail.course.modules.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No modules yet.</p>
                ) : (
                  <div className="space-y-4">
                    {detail.course.modules.map((m) => (
                      <div key={m.id}>
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{m.title}</p>
                        <ul className="divide-y divide-border rounded-xl border border-border">
                          {m.lessons.length === 0 && <li className="px-3 py-2.5 text-sm text-muted-foreground">No lessons</li>}
                          {m.lessons.map((l) => (
                            <li key={l.id}>
                              <Link href={l.href} className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50">
                                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm text-foreground">{l.title}</span>
                                  <span className="block text-xs capitalize text-muted-foreground">
                                    {l.contentType} · {l.estimatedMins} min{l.author ? ` · ${l.author.name}` : ""}
                                  </span>
                                </span>
                                {!l.mosMapped && <span className="shrink-0 rounded bg-warning/15 px-1.5 py-0.5 text-[11px] font-medium text-foreground">No MOS link</span>}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </>
          )}

          {(detail.question || detail.lesson) && (
            <Section title="Part 61 MOS links">
              <MosList links={detail.question?.mos ?? detail.lesson?.mos ?? []} required={needsMos} />
            </Section>
          )}

          <Section title="Activity">
            <ReviewThread
              type={detail.type}
              id={detail.id}
              events={detail.events}
              onChange={onChange}
              placeholder="Comment without making a decision. The author sees it too."
              emptyText="Nothing yet. Submissions, comments and decisions show up here."
            />
          </Section>
        </div>
      </div>

      {detail.inQueue && <DecisionBar detail={detail} onDecided={onDecided} />}
    </div>
  )
}
