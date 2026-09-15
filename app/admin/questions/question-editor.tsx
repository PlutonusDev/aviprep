"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertCircle, Check, Eye, Loader2, Plus, Trash2, Lightbulb, Radio } from "lucide-react"
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

export interface EditableQuestion extends QuestionDraft {
  id?: string
  authorNote?: string | null
  /** A curator's proposed edit to a live question, awaiting an admin. */
  pendingRevision?: Partial<QuestionDraft> | null
  pendingRevisionAt?: string | null
}

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
 * A full-width authoring form rather than a modal. Writing a stem, four
 * options, an explanation and a citation needs room, and an author works
 * through many in a row.
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
  onReviewRevision?: (action: "apply-revision" | "discard-revision") => void
  reviewing?: boolean
}) {
  const [touched, setTouched] = useState(false)

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

  const attemptSave = (status: string, addAnother: boolean) => {
    setTouched(true)
    if (!ready) return
    onSave(status, addAnother)
  }

  const curatorOnLive = !canPublish && isLive

  return (
    <div className="space-y-6">
      {curatorOnLive && (
        <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <Radio className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-foreground">
            This question is live. Your edits are sent to an admin for review, and students keep seeing the current
            version until they&apos;re approved.
          </p>
        </div>
      )}

      {canPublish && pendingRevision && onReviewRevision && (
        <div className="space-y-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          <p className="font-medium text-foreground">A curator has proposed changes to this live question.</p>
          <p className="text-muted-foreground">
            Load them into the form to compare, then apply or discard. Nothing changes for students until you apply.
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
            <Button type="button" size="sm" className="h-9 gap-1.5" disabled={reviewing} onClick={() => onReviewRevision("apply-revision")}>
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Apply changes
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 text-muted-foreground"
              disabled={reviewing}
              onClick={() => onReviewRevision("discard-revision")}
            >
              Discard
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="q-topic">Topic</Label>
          <Input
            id="q-topic"
            list="known-topics"
            value={value.topic}
            onChange={(e) => set({ topic: e.target.value })}
            onBlur={() => setTouched(true)}
            aria-invalid={shown.topic ? true : undefined}
            className="h-11"
            placeholder="e.g. Bernoulli's Principle"
          />
          {/* Picking from existing topics stops near-duplicates like
              "Bernoullis Principle" fragmenting the topic list and the
              weak-point analytics built on it. */}
          <datalist id="known-topics">
            {knownTopics.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          <FieldError message={shown.topic} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="q-difficulty">Difficulty</Label>
          <Select value={value.difficulty} onValueChange={(v) => set({ difficulty: v })}>
            <SelectTrigger id="q-difficulty" className="h-11">
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
          <FieldError message={shown.difficulty} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="q-text">Question</Label>
        <Textarea
          id="q-text"
          value={value.questionText}
          onChange={(e) => set({ questionText: e.target.value })}
          onBlur={() => setTouched(true)}
          aria-invalid={shown.questionText ? true : undefined}
          rows={4}
          placeholder="Write the full question stem..."
        />
        <FieldError message={shown.questionText} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Options</Label>
          <span className="text-xs text-muted-foreground">
            Select the radio button beside the correct answer
          </span>
        </div>

        {value.options.map((option, index) => {
          const correct = value.correctIndex === index
          return (
            <div
              key={index}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                correct ? "border-success/50 bg-success/5" : "border-border",
              )}
            >
              <input
                type="radio"
                name="correct-option"
                checked={correct}
                onChange={() => set({ correctIndex: index })}
                aria-label={`Mark option ${String.fromCharCode(65 + index)} as correct`}
                className="mt-3 h-4 w-4 shrink-0"
              />
              <span className="mt-2.5 w-4 shrink-0 text-sm font-medium text-muted-foreground">
                {String.fromCharCode(65 + index)}
              </span>
              <div className="min-w-0 flex-1 space-y-1.5">
                <Input
                  value={option}
                  onChange={(e) => setOption(index, e.target.value)}
                  onBlur={() => setTouched(true)}
                  aria-invalid={shown[`option-${index}`] ? true : undefined}
                  className="h-10"
                  placeholder={`Option ${String.fromCharCode(65 + index)}`}
                />
                <FieldError message={shown[`option-${index}`]} />
              </div>
              {correct && (
                <Badge variant="secondary" className="mt-2 shrink-0 gap-1 text-success">
                  <Check className="h-3 w-3" aria-hidden="true" />
                  Correct
                </Badge>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeOption(index)}
                disabled={value.options.length <= MIN_OPTIONS}
                aria-label={`Remove option ${String.fromCharCode(65 + index)}`}
                className="mt-1 shrink-0"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          )
        })}

        <FieldError message={shown.options} />
        <FieldError message={shown.correctIndex} />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addOption}
          disabled={value.options.length >= MAX_OPTIONS}
          className="h-9 gap-1.5"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add option
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="q-explanation">Explanation</Label>
        <Textarea
          id="q-explanation"
          value={value.explanation}
          onChange={(e) => set({ explanation: e.target.value })}
          onBlur={() => setTouched(true)}
          aria-invalid={shown.explanation ? true : undefined}
          rows={3}
          placeholder="Why is the correct answer correct? Students read this after answering."
        />
        <FieldError message={shown.explanation} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="q-reference">Reference</Label>
        <Input
          id="q-reference"
          value={value.reference ?? ""}
          onChange={(e) => set({ reference: e.target.value })}
          className="h-11"
          placeholder="e.g. CASA Part 61 MOS, Schedule 3, 2.1"
        />
        <p className="text-xs text-muted-foreground">
          Optional, but a cited question can be defended if a student disputes it.
        </p>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Lightbulb className="h-4 w-4 text-warning" aria-hidden="true" />
            Suggestions
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
        {curatorOnLive ? (
          <Button onClick={() => attemptSave("review", false)} disabled={saving} className="h-11">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Submit changes for review
          </Button>
        ) : (
          <>
            <Button onClick={() => attemptSave("draft", false)} disabled={saving} variant="outline" className="h-11">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Save draft
            </Button>
            <Button
              onClick={() => attemptSave("review", false)}
              disabled={saving}
              variant={canPublish ? "secondary" : "default"}
              className="h-11"
            >
              Submit for review
            </Button>
            {canPublish && (
              <Button onClick={() => attemptSave("published", false)} disabled={saving} className="h-11">
                Publish
              </Button>
            )}
            <Button onClick={() => attemptSave("draft", true)} disabled={saving} variant="ghost" className="h-11">
              Save &amp; write another
            </Button>
          </>
        )}
        <Button onClick={onCancel} variant="ghost" className="ml-auto h-11">
          Cancel
        </Button>
      </div>

      {touched && !ready && (
        <p role="alert" className="text-sm text-destructive">
          Fix the highlighted fields before saving.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        {canPublish
          ? QUESTION_STATUSES.map((s) => `${s.label}: ${s.description}`).join("  ·  ")
          : "Draft: only you and admins see it  ·  In review: ready for an admin to check and publish"}
      </p>
    </div>
  )
}
