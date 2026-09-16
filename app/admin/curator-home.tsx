"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { formatDistanceToNowStrict } from "date-fns"
import {
  ArrowRight,
  BookOpenText,
  CircleCheck,
  Clock,
  FileText,
  GraduationCap,
  HelpCircle,
  Info,
  MessageSquareWarning,
  PenLine,
  Sparkles,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { LoadError, PageHeader, PageShell, SectionHeading, StatTile } from "@/components/hub/page-primitives"
import { credentialLabel } from "@lib/curators/details"
import { cn } from "@lib/utils"

interface SubjectEstimate {
  subjectId: string
  name: string
  myPoints: number
  totalPoints: number
  netCents: number
  estimateCents: number
}

interface HomeData {
  curator: { firstName: string; credentials: string[] }
  royalties: { estimateCents: number; myPoints: number; windowDays: number; subjects: SubjectEstimate[] }
  payoutDate: string
  questions: { live: number; review: number; draft: number; needsChanges: number }
  lessons: { live: number; total: number }
  pending: number
  inReview: { kind: "question" | "lesson"; id: string; title: string; at: string | null; change: "new" | "edit"; href: string }[]
  feedback: {
    kind: "question" | "lesson"
    id: string
    title: string
    reason: string
    at: string | null
    outcome: "sent-back" | "edit-declined"
    href: string
  }[]
}

const GUIDELINES_HREF = "/api/curators/guidelines"

const money = (cents: number) =>
  (cents / 100).toLocaleString("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 })

const ago = (date: string | null) => (date ? formatDistanceToNowStrict(new Date(date), { addSuffix: true }) : "")

function greeting() {
  const hour = new Date().getHours()
  return hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening"
}

function KindBadge({ kind }: { kind: "question" | "lesson" }) {
  const Icon = kind === "question" ? HelpCircle : FileText
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {kind === "question" ? "Question" : "Lesson"}
    </span>
  )
}

/** The headline number, with the subjects it comes from beside it. */
function PayoutCard({ data }: { data: HomeData }) {
  const { royalties } = data
  const payout = new Date(data.payoutDate)
  const period = new Date(payout.getFullYear(), payout.getMonth() - 1, 1).toLocaleDateString("en-AU", { month: "long" })
  const paidBy = payout.toLocaleDateString("en-AU", { day: "numeric", month: "long" })
  const hasPoints = royalties.myPoints > 0

  return (
    <section
      aria-labelledby="payout-heading"
      className="overflow-hidden rounded-xl border border-border bg-card shadow-e1 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
    >
      <div className="relative bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5 sm:p-6">
        <p id="payout-heading" className="text-sm font-medium text-muted-foreground">
          Expected next payout
        </p>
        <p className="mt-2 font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl" data-tabular>
          {money(royalties.estimateCents)}
        </p>
        <p className="mt-2 text-sm text-foreground">
          For {period}, paid by {paidBy}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1.5 border-primary/30 bg-background/60 py-1 text-xs font-medium">
            <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
            {royalties.myPoints.toLocaleString()} active {royalties.myPoints === 1 ? "point" : "points"}
          </Badge>
        </div>
        <p className="mt-5 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          An estimate from the last {royalties.windowDays} days of sales and your share of each subject’s points. Your monthly statement is final.
        </p>
      </div>

      <div className="border-t border-border p-5 sm:p-6 lg:border-l lg:border-t-0">
        <p className="text-sm font-medium text-foreground">By subject</p>
        {hasPoints ? (
          <ul className="mt-3 space-y-4">
            {royalties.subjects.map((s) => {
              const share = s.totalPoints ? (s.myPoints / s.totalPoints) * 100 : 0
              return (
                <li key={s.subjectId}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate text-sm text-foreground">{s.name}</p>
                    <p className="shrink-0 text-sm font-semibold text-foreground" data-tabular>
                      {money(s.estimateCents)}
                    </p>
                  </div>
                  <div
                    className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
                    role="img"
                    aria-label={`${share.toFixed(1)}% of the points in ${s.name}`}
                  >
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(share, 1.5)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground" data-tabular>
                    {s.myPoints.toLocaleString()} of {s.totalPoints.toLocaleString()} points · {share < 10 ? share.toFixed(1) : Math.round(share)}% share
                  </p>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed border-border px-4 py-6 text-center">
            <p className="text-sm text-foreground">Nothing live yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Your estimate appears once something you wrote is published.</p>
          </div>
        )}
      </div>
    </section>
  )
}

function Feedback({ items }: { items: HomeData["feedback"] }) {
  return (
    <section>
      <SectionHeading title="Needs changes" count={items.length ? String(items.length) : undefined} />
      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-5">
          <CircleCheck className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Nothing to fix. Anything an admin sends back shows up here with their notes.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`} className="rounded-xl border border-border bg-card p-4 shadow-e1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <KindBadge kind={item.kind} />
                <span className="text-xs font-medium text-warning">{item.outcome === "sent-back" ? "Sent back" : "Edit not accepted"}</span>
                <span className="ml-auto text-xs text-muted-foreground">{ago(item.at)}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm font-medium text-foreground">{item.title}</p>
              <div className="mt-3 flex gap-2.5 rounded-lg bg-warning/10 p-3">
                <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                <p className="whitespace-pre-line text-sm text-foreground">{item.reason}</p>
              </div>
              <div className="mt-3 flex justify-end">
                <Button asChild size="sm" variant="outline" className="h-9 gap-1.5">
                  <Link href={item.href}>
                    {item.outcome === "sent-back" ? "Fix it" : "Open"}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function InReview({ items, total }: { items: HomeData["inReview"]; total: number }) {
  return (
    <section>
      <SectionHeading title="In review" count={total ? String(total) : undefined} description={total > items.length ? `Showing the latest ${items.length}` : undefined} />
      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-5">
          <Clock className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Nothing waiting. Submit a draft and it lands here until an admin checks it.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-e1">
          {items.map((item) => (
            <li key={`${item.kind}-${item.change}-${item.id}`}>
              <Link
                href={item.href}
                className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{item.title}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <KindBadge kind={item.kind} />
                    <span aria-hidden="true">·</span>
                    {item.change === "new" ? "New" : "Edit to live content"}
                    <span aria-hidden="true">·</span>
                    {ago(item.at)}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function CuratorHome() {
  const [data, setData] = useState<HomeData | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    fetch("/api/admin/curator-home")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setFailed(true))
  }, [])

  if (failed) return <LoadError title="Couldn't load your home" message="Refresh to try again." />

  if (!data) {
    return (
      <PageShell>
        <div className="space-y-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-60 rounded-xl" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] rounded-lg" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </PageShell>
    )
  }

  const background = data.curator.credentials.filter((c) => c !== "none").map((c) => credentialLabel(c))
  const needsChanges = data.feedback.length

  return (
    <PageShell>
      <PageHeader
        title={`${greeting()}, ${data.curator.firstName}`}
        description={
          needsChanges
            ? `${needsChanges} ${needsChanges === 1 ? "thing needs" : "things need"} your attention.`
            : background.length
              ? background.join(" · ")
              : "Here’s how your writing is tracking."
        }
      >
        <div className="flex flex-wrap gap-2 self-start">
          <Button asChild variant="outline" className="h-10 gap-2">
            <a href={GUIDELINES_HREF} target="_blank" rel="noopener">
              <BookOpenText className="h-4 w-4" aria-hidden="true" />
              Guidelines
            </a>
          </Button>
          <Button asChild className="h-10 gap-2">
            <Link href="/admin/questions">
              <PenLine className="h-4 w-4" aria-hidden="true" />
              Write a question
            </Link>
          </Button>
        </div>
      </PageHeader>

      <PayoutCard data={data} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={HelpCircle}
          label="Live questions"
          value={data.questions.live.toLocaleString()}
          detail={data.questions.draft ? `${data.questions.draft} in draft` : undefined}
        />
        <StatTile
          icon={GraduationCap}
          label="Live lessons"
          value={data.lessons.live.toLocaleString()}
          detail={data.lessons.total > data.lessons.live ? `${data.lessons.total - data.lessons.live} in draft courses` : undefined}
        />
        <StatTile icon={Clock} label="In review" value={data.pending.toLocaleString()} />
        <div className={cn(needsChanges > 0 && "rounded-lg ring-1 ring-warning/50")}>
          <StatTile icon={MessageSquareWarning} label="Needs changes" value={needsChanges.toLocaleString()} />
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Feedback items={data.feedback} />
        <InReview items={data.inReview} total={data.pending} />
      </div>
    </PageShell>
  )
}

