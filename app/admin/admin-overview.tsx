"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  DollarSign,
  FileEdit,
  GraduationCap,
  HelpCircle,
  ListChecks,
  Mail,
  Package,
  PenLine,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, PageHeader, PageShell, SectionHeading, StatTile } from "@/components/hub/page-primitives"
import { useUser } from "@lib/user-context"

interface Stats {
  totalMembers: number
  newMembers: number
  totalQuestions: number
  totalRevenue: number
  activeSubscriptions: number
  waitlistCount: number
  rtoContacts: number
  queue: {
    review: number
    newContent: number
    edits: number
    mosReviews: number
    curatorInvites: number
  }
}

const SHORTCUTS = [
  { name: "Review content", href: "/admin/review", icon: ClipboardCheck },
  { name: "Write questions", href: "/admin/questions", icon: HelpCircle },
  { name: "Edit courses", href: "/admin/courses", icon: GraduationCap },
  { name: "AI generator", href: "/admin/questions/generate", icon: Sparkles },
  { name: "MOS coverage", href: "/admin/mos", icon: ShieldCheck },
  { name: "Members", href: "/admin/members", icon: Users },
  { name: "Flight schools", href: "/admin/flight-schools", icon: Building2 },
  { name: "Products", href: "/admin/products", icon: Package },
  { name: "Coupons", href: "/admin/coupons", icon: Ticket },
  { name: "Send email", href: "/admin/email", icon: Mail },
]

const aud = (cents: number) =>
  (cents / 100).toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 })

export function AdminOverview() {
  const { user } = useUser()
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setStats)
      .catch(() => setError(true))
  }, [])

  const q = stats?.queue
  const queue = q
    ? [
        { label: "New content to review", count: q.newContent, href: "/admin/review", icon: ClipboardCheck },
        { label: "Proposed edits to live content", count: q.edits, href: "/admin/review?kind=edit", icon: FileEdit },
        { label: "MOS links to review", count: q.mosReviews, href: "/admin/mos", icon: ShieldCheck },
        { label: "Curator invites waiting", count: q.curatorInvites, href: "/admin/curators", icon: PenLine },
      ].filter((i) => i.count > 0)
    : []

  return (
    <PageShell>
      <PageHeader title={user ? `G'day, ${user.firstName}` : "Overview"} description="What's happening on AviPrep." />

      {error ? (
        <div role="alert">
          <EmptyState icon={AlertTriangle} title="Couldn't load stats" description="Refresh to try again." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats ? (
              <>
                <StatTile icon={Users} label="Members" value={stats.totalMembers.toLocaleString()} detail={`${stats.newMembers} this week`} />
                <StatTile icon={CheckCircle2} label="Active bundles" value={stats.activeSubscriptions.toLocaleString()} />
                <StatTile icon={DollarSign} label="Revenue" value={aud(stats.totalRevenue)} detail="All time" />
                <StatTile icon={HelpCircle} label="Questions" value={stats.totalQuestions.toLocaleString()} />
              </>
            ) : (
              [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[88px] rounded-lg" />)
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <section className="lg:col-span-3">
              <SectionHeading title="Needs you" count={queue.length ? String(queue.reduce((n, i) => n + i.count, 0)) : undefined} />
              {!stats ? (
                <Skeleton className="h-48 rounded-xl" />
              ) : queue.length === 0 ? (
                <EmptyState icon={ListChecks} title="All clear" description="Nothing waiting for review." />
              ) : (
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-e1">
                  {queue.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <item.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                        </span>
                        <span className="flex-1 text-sm font-medium text-foreground">{item.label}</span>
                        <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-sm font-semibold text-foreground" data-tabular>
                          {item.count}
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {stats && (stats.waitlistCount > 0 || stats.rtoContacts > 0) && (
                <p className="mt-3 text-sm text-muted-foreground" data-tabular>
                  {stats.waitlistCount.toLocaleString()} on the waitlist · {stats.rtoContacts} RTO enquir{stats.rtoContacts === 1 ? "y" : "ies"}
                </p>
              )}
            </section>

            <section className="lg:col-span-2">
              <SectionHeading title="Jump to" />
              <ul className="grid grid-cols-2 gap-2">
                {SHORTCUTS.map((s) => (
                  <li key={s.href} className="min-w-0">
                    <Link
                      href={s.href}
                      className="flex h-full items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <s.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="truncate">{s.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </PageShell>
  )
}
