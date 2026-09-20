import type { MosLink } from "@lib/mos/subjects"

/** Client-side shapes of lib/review/review.ts, with dates as strings. */

export type ContentType = "question" | "lesson" | "course"
export type ReviewKind = "new" | "edit"
export type ReviewAction = "approve" | "request-changes" | "reject" | "comment"
export type EventAction = "submitted" | "comment" | "approved" | "changes-requested" | "rejected" | "ai-comment" | "ai-flagged"

export interface Person {
  id: string
  name: string
  email: string | null
  role: "admin" | "curator" | "ai"
  credentials: string[]
}

export interface QueueItem {
  key: string
  type: ContentType
  kind: ReviewKind
  id: string
  title: string
  subjectId: string
  subjectName: string
  context: string
  submittedAt: string | null
  submittedBy: Person | null
  author: Person | null
  comments: number
  resubmitted: boolean
  aiFlagged: boolean
  missingMos: boolean
}

export interface TimelineEvent {
  id: string
  kind: ReviewKind
  action: EventAction
  message: string | null
  /** Approved edits: points credited, or 0 for a minor edit. */
  points: number | null
  createdAt: string
  actor: Person | null
}

export interface FieldChange {
  field: string
  label: string
  before: string
  after: string
}

export interface QuestionBody {
  subjectId: string
  topic: string
  difficulty: string
  questionText: string
  imageUrl?: string | null
  imageAlt?: string | null
  /** "choice" | "numeric". Null reads as multiple choice. */
  answerType?: string | null
  options: string[]
  correctIndex: number | null
  /** Typed answers: the value wanted, and how far out still counts. */
  answerValue?: number | null
  answerUnit?: string | null
  tolerance?: number | null
  toleranceType?: string | null
  explanation: string
  reference: string
  points?: number
  authorNote?: string | null
}

export interface LessonBody {
  title: string
  description: string | null
  contentType: string
  estimatedMins: number
  html: string | null
  summary: string | null
}

export interface CourseLesson {
  id: string
  title: string
  contentType: string
  estimatedMins: number
  mosMapped: boolean
  author: Person | null
  href: string
}

export interface ReviewDetail {
  type: ContentType
  id: string
  kind: ReviewKind | null
  title: string
  subjectId: string
  subjectName: string
  status: string
  live: boolean
  inQueue: boolean
  changesRequested: boolean
  author: Person | null
  proposer: Person | null
  submittedAt: string | null
  editHref: string
  question?: { current: QuestionBody; proposed: QuestionBody | null; mos: MosLink[] }
  lesson?: {
    course: { id: string; title: string; isPublished: boolean }
    module: string
    current: LessonBody
    proposed: LessonBody | null
    mos: MosLink[]
  }
  course?: {
    current: { title: string; description: string; estimatedHours: number; difficulty: string }
    proposed: { title?: string; description?: string; estimatedHours?: number; difficulty?: string } | null
    modules: { id: string; title: string; lessons: CourseLesson[] }[]
    missingMos: number
  }
  changes: FieldChange[]
  /** Set on edits. required: a curator edited someone else's work, so the reviewer decides on credit. */
  creditChoice: { required: boolean; options: number[] } | null
  /** Credits already awarded for earlier edits. */
  credits: { id: string; points: number; createdAt: string; person: Person | null }[]
  events: TimelineEvent[]
}
