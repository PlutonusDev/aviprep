"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertCircle,
  Check,
  ChevronDown,
  CornerUpLeft,
  Eye,
  Loader2,
  MessageSquareWarning,
  Plus,
  Trash2,
  Lightbulb,
  Radio,
} from "lucide-react"
import { cn } from "@lib/utils"
import {
  DIFFICULTIES,
  MAX_OPTIONS,
  MIN_OPTIONS,
  QUESTION_STATUSES,
  validateQuestion,
  questionWarnings,
  isValid,
  type FieldErrors,
  type QuestionDraft,
} from "@lib/question-validation"
import { MosTagger } from "@/components/admin/mos-tagger"
import { MosFocusCard } from "@/components/admin/mos-focus-card"
import { ReviewActivity } from "@/components/review/review-activity"
import { questionMatchText } from "@lib/mos/content-text"
import type { MosLink } from "@lib/mos/subjects"

export interface EditableQuestion extends QuestionDraft {
  id?: string
  authorNote?: string | null
  /** A curator's proposed edit to a live question, awaiting an admin. */
  pendingRevision?: Partial<QuestionDraft> | null
  pendingRevisionAt?: string | null
  /** Royalty points: 1 standard, 3 complex. Set by an admin when publishing. */
  points?: number | null
  /** Admin feedback from sending it back or declining an edit. */
  rejectionReason?: string | null
  rejectedAt?: string | null
  /** Part 61 MOS links. Undefined until an existing question's links have loaded. */
  mos?: MosLink[]
}

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"]

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="flex items-start gap-1.5 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  )
}

/**
 * Grows to its content instead of scrolling inside itself. An author reads the
 * whole stem back before they trust it, and a scrollbar in a four-line box
 * hides the end of the sentence they're checking.
 */
function GrowTextarea({
  className,
  value,
  minRows = 2,
  ...props
}: React.ComponentProps<typeof Textarea> & { minRows?: number }) {
  const ref = useRef<HTMLTextAreaElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return (
    <Textarea
      {...props}
      ref={ref}
      value={value}
      rows={minRows}
      className={cn("resize-none overflow-hidden", className)}
    />
  )
}

/** A section that stays out of the way until it's wanted. */
function Disclosure({
  label,
  detail,
  defaultOpen = false,
  children,
}: {
  label: string
  detail?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        {label}
        {detail && <span className="truncate text-xs font-normal text-muted-foreground">{detail}</span>}
        <ChevronDown className={cn("ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && <div className="border-t border-border p-4">{children}</div>}
    </div>
  )
}

/** Feedback for a curator, typed before sending a question back or declining an edit. */
function FeedbackBox({
  label,
  hint,
  value,
  onChange,
  required = false,
  busy,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  label: string
  hint: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  busy: boolean
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}) {
  const tooShort = required && value.trim().length < 10
  return (
    <div className="space-y-2 border-t border-border pt-3">
      <Label htmlFor="review-feedback">{label}</Label>
      <Textarea
        id="review-feedback"
        rows={3}
        autoFocus
        maxLength={1000}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Option C also works at 35°C. Tighten the stem so only one answer fits."
        aria-describedby="review-feedback-hint"
        className="resize-none bg-background"
      />
      <p id="review-feedback-hint" className="text-xs text-muted-foreground">
        {hint}
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" className="h-9" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="button" size="sm" className="h-9" onClick={onConfirm} disabled={busy || tooShort}>
          {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          {confirmLabel}
        </Button>
      </div>
    </div>
  )
}

/** Royalty points for the question (Contractor Agreement 3.4), chosen as it's published. */
function PointsPicker({ value, onChange }: { value?: number | null; onChange: (points: 1 | 3) => void }) {
  const current = value === 3 ? 3 : 1
  const options = [
    { points: 1 as const, label: "Standard", hint: "1 point" },
    { points: 3 as const, label: "Complex", hint: "3 points: charts, multi-step calculations or images" },
  ]
  return (
    <div role="radiogroup" aria-label="Royalty points" className="flex h-10 items-center rounded-lg border border-border bg-muted/40 p-1">
      {options.map((o) => (
        <button
          key={o.points}
          type="button"
          role="radio"
          aria-checked={current === o.points}
          title={o.hint}
          onClick={() => onChange(o.points)}
          className={cn(
            "flex h-full items-center gap-1.5 rounded-md px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            current === o.points ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
          <span className="rounded bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">{o.points}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * The authoring form, laid out as the question will actually be sat: one stem,
 * lettered options, nothing between them. Everything an author sets once and
 * rarely touches again - topic, difficulty, citation, MOS mapping - is a line
 * or a disclosure rather than a field they scroll past on every question.
 */
export default function QuestionEditor({
  value,
  onChange,
  onSave,
  onCancel,
  saving,
  serverErrors,
  knownTopics,
  canPublish = true,
  isLive = false,
  pendingRevision,
  onReviewRevision,
  onSendBack,
  inReview = false,
  reviewing = false,
}: {
  value: EditableQuestion
  onChange: (next: EditableQuestion) => void
  onSave: (status: string, addAnother: boolean) => void
  onCancel: () => void
  saving: boolean
  serverErrors?: FieldErrors
  knownTopics: string[]
  /** Admins publish; curators can only submit for review. */
  canPublish?: boolean
  /** Editing a question students can already see. */
  isLive?: boolean
  /** Admin view: a curator's proposed changes to this live question. */
  pendingRevision?: Partial<QuestionDraft> | null
  onReviewRevision?: (action: "apply-revision" | "discard-revision", reason?: string) => void
  /** Admin: return an in-review question to its author with feedback. */
  onSendBack?: (reason: string) => void
  /** The saved question is waiting for review. */
  inReview?: boolean
  reviewing?: boolean
}) {
  const [touched, setTouched] = useState(false)
  /** Which feedback box is open: sending back a question, or declining an edit. */
  const [feedbackFor, setFeedbackFor] = useState<"send-back" | "discard" | null>(null)
  const [reason, setReason] = useState("")
  const [mosError, setMosError] = useState<string | undefined>()

  const errors = useMemo(() => validateQuestion(value), [value])
  const warnings = useMemo(() => questionWarnings(value), [value])
  const shown: FieldErrors = touched ? { ...errors, ...serverErrors } : serverErrors ?? {}
  const ready = isValid(errors)

  const set = (patch: Partial<EditableQuestion>) => onChange({ ...value, ...patch })

  const setOption = (index: number, text: string) => {
    const options = [...value.options]
    options[index] = text
    set({ options })
  }

  const addOption = () => {
    if (value.options.length >= MAX_OPTIONS) return
    set({ options: [...value.options, ""] })
  }

  const removeOption = (index: number) => {
    if (value.options.length <= MIN_OPTIONS) return
    const options = value.options.filter((_, i) => i !== index)
    // Keep the correct answer pointing at the same option after a removal.
    let correctIndex = value.correctIndex
    if (index === correctIndex) correctIndex = 0
    else if (index < correctIndex) correctIndex -= 1
    set({ options, correctIndex })
  }

  const hasPrimaryMos = !!value.mos?.some((l) => l.primary)
  const primaryMos = value.mos?.find((l) => l.primary && l.item)?.item

  const attemptSave = (status: string, addAnother: boolean) => {
    setTouched(true)
    // Publishing needs a primary MOS item. Already-live questions are flagged on
    // the coverage dashboard rather than blocked from edits.
    const needsMos = status === "published" && !isLive && value.mos !== undefined && !hasPrimaryMos
    setMosError(needsMos ? "Add a primary MOS item before publishing." : undefined)
    if (!ready || needsMos) return
    onSave(status, addAnother)
  }

  const curatorOnLive = !canPublish && isLive
  const optionErrors = value.options.map((_, i) => shown[`option-${i}`]).filter(Boolean) as string[]

  return (
    <div className="space-y-4">
      {/* --- Anything the author needs told before they start ---------------- */}

      {curatorOnLive && (
        <div className="flex items-start gap-2.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm">
          <Radio className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-foreground">
            This one is live. Your changes go for review; students keep seeing the current version until then.
          </p>
        </div>
      )}

      {!canPublish && value.rejectionReason && (
        <div className="flex items-start gap-2.5 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm">
          <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <div className="min-w-0 space-y-1">
            <p className="font-medium text-foreground">{isLive ? "Your last edit wasn't accepted" : "Changes requested"}</p>
            <p className="whitespace-pre-line text-foreground/90">{value.rejectionReason}</p>
          </div>
        </div>
      )}

      {canPublish && inReview && !isLive && onSendBack && (
        <div className="space-y-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-foreground">Waiting for your review</p>
              <p className="text-muted-foreground">Publish below, or send it back with feedback.</p>
            </div>
            {feedbackFor !== "send-back" && (
              <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setFeedbackFor("send-back")}>
                <CornerUpLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Send back
              </Button>
            )}
          </div>
          {feedbackFor === "send-back" && (
            <FeedbackBox
              label="What needs to change?"
              hint="They'll see this on their home screen and in the editor."
              value={reason}
              onChange={setReason}
              required
              busy={reviewing}
              confirmLabel="Send back"
              onCancel={() => setFeedbackFor(null)}
              onConfirm={() => onSendBack(reason.trim())}
            />
          )}
        </div>
      )}

      {canPublish && pendingRevision && value.id && (
        <div className="space-y-2.5 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">A curator has proposed changes to this live question.</p>
          <p className="text-muted-foreground">
            Nothing changes for students until you approve them.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => onChange({ ...value, ...pendingRevision })}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              Load proposed changes
            </Button>
            <Button asChild size="sm" className="h-9 gap-1.5">
              <a href={`/admin/review?item=question:${value.id}`}>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Review changes
              </a>
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_21rem] xl:items-start">
        {/* --- The MOS item, following the scroll ---------------------------- */}
        {value.subjectId && (
          <div className="sticky top-16 z-20 -mx-1 px-1 pb-1 pt-1 xl:order-2 xl:top-20 xl:mx-0 xl:px-0">
            <MosFocusCard links={value.mos} subjectId={value.subjectId} className="max-h-[38vh] overflow-y-auto xl:max-h-none" />
          </div>
        )}

        <div className="min-w-0 space-y-4 xl:order-1">
          {/* --- The question, as it will be sat ----------------------------- */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-e1 sm:p-5">
            {/* Topic and difficulty read as the exam's meta line, and edit in place. */}
            <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
              <div className="min-w-0 flex-1">
                <Label htmlFor="q-topic" className="sr-only">
                  Topic
                </Label>
                <Input
                  id="q-topic"
                  list="known-topics"
                  value={value.topic}
                  onChange={(e) => set({ topic: e.target.value })}
                  onBlur={() => setTouched(true)}
                  aria-invalid={shown.topic ? true : undefined}
                  className="h-9 border-transparent bg-transparent px-2 text-sm shadow-none hover:border-border focus-visible:border-border"
                  placeholder="Topic, e.g. Bernoulli's Principle"
                />
                {/* Picking from existing topics stops near-duplicates like
                    "Bernoullis Principle" fragmenting the topic list and the
                    weak-point analytics built on it. */}
                <datalist id="known-topics">
                  {knownTopics.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
              <Label htmlFor="q-difficulty" className="sr-only">
                Difficulty
              </Label>
              <Select value={value.difficulty} onValueChange={(v) => set({ difficulty: v })}>
                <SelectTrigger id="q-difficulty" className="h-9 w-32 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d[0].toUpperCase() + d.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FieldError message={shown.topic} />
            <FieldError message={shown.difficulty} />

            {/* The stem, at the weight a student reads it. */}
            <Label htmlFor="q-text" className="sr-only">
              Question
            </Label>
            <GrowTextarea
              id="q-text"
              value={value.questionText}
              onChange={(e) => set({ questionText: e.target.value })}
              onBlur={() => setTouched(true)}
              aria-invalid={shown.questionText ? true : undefined}
              minRows={2}
              placeholder="Write the stem, exactly as a student will read it…"
              className="mt-3 border-transparent bg-transparent px-2 text-lg font-medium leading-relaxed text-foreground shadow-none placeholder:font-normal placeholder:text-muted-foreground hover:border-border focus-visible:border-border sm:text-xl"
            />
            <div className="px-2">
              <FieldError message={shown.questionText} />
            </div>

            {/* Options, lettered and sized like the exam. The letter is the
                control: tapping it marks the answer, as marking one is the
                only decision here that isn't typing. */}
            <ul className="mt-4 space-y-2">
              {value.options.map((option, index) => {
                const correct = value.correctIndex === index
                const optionId = `q-option-${index}`
                return (
                  <li
                    key={index}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-colors",
                      correct ? "border-success/60 bg-success/[0.06]" : "border-border hover:border-primary/40",
                    )}
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={correct}
                      aria-label={`Mark option ${LETTERS[index]} as the correct answer`}
                      onClick={() => set({ correctIndex: index })}
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        correct
                          ? "border-success bg-success text-white"
                          : "border-border text-muted-foreground hover:border-primary hover:text-foreground",
                      )}
                    >
                      {correct ? <Check className="h-4 w-4" aria-hidden="true" /> : LETTERS[index]}
                    </button>
                    <Input
                      id={optionId}
                      value={option}
                      onChange={(e) => setOption(index, e.target.value)}
                      onBlur={() => setTouched(true)}
                      aria-invalid={shown[`option-${index}`] ? true : undefined}
                      aria-label={`Option ${LETTERS[index]}`}
                      className="h-9 min-w-0 flex-1 border-transparent bg-transparent px-1.5 shadow-none hover:border-border focus-visible:border-border"
                      placeholder={`Option ${LETTERS[index]}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(index)}
                      disabled={value.options.length <= MIN_OPTIONS}
                      aria-label={`Remove option ${LETTERS[index]}`}
                      className="h-8 w-8 shrink-0 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 disabled:hidden"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </li>
                )
              })}
            </ul>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addOption}
                disabled={value.options.length >= MAX_OPTIONS}
                className="h-8 gap-1.5 text-muted-foreground"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add option
              </Button>
              <p className="text-xs text-muted-foreground">Click a letter to mark the answer</p>
            </div>

            {optionErrors.map((message, i) => (
              <FieldError key={i} message={message} />
            ))}
            <FieldError message={shown.options} />
            <FieldError message={shown.correctIndex} />

            {/* The explanation belongs with the question, not a scroll away:
                it's written against the option just marked correct. */}
            <div className="mt-4 border-t border-border pt-3">
              <Label htmlFor="q-explanation" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Explanation
              </Label>
              <GrowTextarea
                id="q-explanation"
                value={value.explanation}
                onChange={(e) => set({ explanation: e.target.value })}
                onBlur={() => setTouched(true)}
                aria-invalid={shown.explanation ? true : undefined}
                minRows={2}
                placeholder="Why that answer is right. Students read this the moment they answer."
                className="mt-1.5 border-transparent bg-transparent px-2 text-sm leading-relaxed shadow-none hover:border-border focus-visible:border-border"
              />
              <div className="px-2">
                <FieldError message={shown.explanation} />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <Label htmlFor="q-reference" className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Reference
              </Label>
              <Input
                id="q-reference"
                value={value.reference ?? ""}
                onChange={(e) => set({ reference: e.target.value })}
                className="h-9 min-w-0 flex-1 border-transparent bg-transparent px-2 text-sm shadow-none hover:border-border focus-visible:border-border"
                placeholder={
                  primaryMos ? `e.g. CASA Part 61 MOS, Schedule 3, ${primaryMos.ref}` : "e.g. CASA Part 61 MOS, Schedule 3, 2.1"
                }
              />
            </div>
          </div>

          {warnings.length > 0 && (
            <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
              <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Lightbulb className="h-4 w-4 text-warning" aria-hidden="true" />
                Suggestions
              </p>
              <ul className="list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Mapping is usually done for them by the link they arrived on, so
              it opens only when something is missing or wrong. */}
          {value.subjectId && (
            <Disclosure
              label="MOS mapping"
              detail={primaryMos ? `Primary: ${primaryMos.ref}` : "No primary item yet"}
              defaultOpen={!!mosError || !hasPrimaryMos}
            >
              <MosTagger
                subjectId={value.subjectId}
                matchText={questionMatchText(value)}
                value={value.mos}
                onChange={(mos) => {
                  if (mos.some((l) => l.primary)) setMosError(undefined)
                  onChange({ ...value, mos })
                }}
                contentType="question"
                contentId={value.id}
                error={mosError ?? (serverErrors as Record<string, string> | undefined)?.mos}
                isAdmin={canPublish}
              />
            </Disclosure>
          )}

          {value.id && (
            <Disclosure label="History" detail="Reviews, feedback and changes">
              <ReviewActivity type="question" id={value.id} />
            </Disclosure>
          )}
        </div>
      </div>

      {/* --- Saving, always within reach ------------------------------------ */}
      <div className="sticky bottom-0 z-20 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
        <div className="flex flex-wrap items-center gap-2">
          {curatorOnLive ? (
            <Button onClick={() => attemptSave("review", false)} disabled={saving} className="h-10">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Submit changes for review
            </Button>
          ) : (
            <>
              <Button
                onClick={() => attemptSave("review", false)}
                disabled={saving}
                variant={canPublish ? "secondary" : "default"}
                className="h-10"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                Submit for review
              </Button>
              <Button onClick={() => attemptSave("draft", false)} disabled={saving} variant="outline" className="h-10">
                Save draft
              </Button>
              <Button onClick={() => attemptSave("draft", true)} disabled={saving} variant="ghost" className="h-10">
                Save &amp; write another
              </Button>
              {canPublish && (
                <div className="flex items-center gap-2">
                  <PointsPicker value={value.points} onChange={(points) => set({ points })} />
                  <Button onClick={() => attemptSave("published", false)} disabled={saving} className="h-10">
                    Publish
                  </Button>
                </div>
              )}
            </>
          )}
          <Button onClick={onCancel} variant="ghost" className="ml-auto h-10">
            Cancel
          </Button>
        </div>

        {touched && !ready ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            Fix the highlighted fields before saving.
          </p>
        ) : (
          <p className="mt-2 hidden text-xs text-muted-foreground sm:block">
            {canPublish
              ? QUESTION_STATUSES.map((s) => `${s.label}: ${s.description}`).join("  ·  ")
              : "Drafts stay with you. Submit when it's ready."}
          </p>
        )}
      </div>
    </div>
  )
}
