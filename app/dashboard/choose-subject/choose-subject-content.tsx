"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  BookOpen,
  Brain,
  Calculator,
  Check,
  ClipboardList,
  Cloud,
  Cog,
  Compass,
  Gauge,
  Gift,
  Loader2,
  Plane,
  Radio,
  Scale,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react"
import { toast } from "sonner"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, LoadError, PageHeader, PageShell } from "@/components/hub/page-primitives"
import { useUser } from "@lib/user-context"
import { cn } from "@lib/utils"

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain,
  Calculator,
  Cloud,
  Cog,
  Compass,
  Gauge,
  Plane,
  Radio,
  Scale,
  TrendingUp,
}

interface Offer {
  id: string
  name: string
  code: string
  licenseType: string
  description: string
  icon: string
  questionCount: number
  hasLessons: boolean
  owned: boolean
}

interface Payload {
  canClaim: boolean
  claimedSubjectId: string | null
  months: number
  licenses: { id: string; name: string; fullName: string }[]
  subjects: Offer[]
}

export default function ChooseSubjectContent() {
  const router = useRouter()
  const { refresh } = useUser()
  const [data, setData] = useState<Payload | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [license, setLicense] = useState<string>("all")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [claiming, setClaiming] = useState(false)

  useEffect(() => {
    fetch("/api/user/free-subject")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Payload) => {
        setData(d)
        setStatus("ready")
      })
      .catch(() => setStatus("error"))
  }, [])

  const visible = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    return data.subjects.filter(
      (s) =>
        (license === "all" || s.licenseType === license) &&
        (!q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)),
    )
  }, [data, license, query])

  const choice = data?.subjects.find((s) => s.id === selected) ?? null

  async function claim() {
    if (!choice) return
    setClaiming(true)
    try {
      const res = await fetch("/api/user/free-subject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId: choice.id }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(result.error || "Couldn't unlock that subject.")
        if (res.status === 409) setData((d) => (d ? { ...d, canClaim: false } : d))
        return
      }
      await refresh()
      toast.success(`${result.subjectName} unlocked`)
      router.push("/dashboard")
    } catch {
      toast.error("Couldn't reach the server. Check your connection.")
    } finally {
      setClaiming(false)
      setConfirmOpen(false)
    }
  }

  if (status === "error") return <LoadError title="Couldn't load subjects" message="Try again in a moment." />

  if (status === "loading" || !data) {
    return (
      <PageShell>
        <div className="space-y-3">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </PageShell>
    )
  }

  if (!data.canClaim) {
    const claimed = data.subjects.find((s) => s.id === data.claimedSubjectId)
    return (
      <PageShell>
        <EmptyState
          icon={Gift}
          title={claimed ? `Your free subject is ${claimed.name}` : "No free subject to choose"}
          description={
            claimed
              ? "It's already unlocked in your subjects."
              : "Free subjects are for new accounts. Browse subjects to unlock more."
          }
        >
          <Button asChild className="h-10">
            <Link href={claimed ? "/dashboard/exams" : "/dashboard/pricing"}>{claimed ? "Go to subjects" : "Browse subjects"}</Link>
          </Button>
        </EmptyState>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader
        title="Choose your free subject"
        description={`Pick one subject to unlock free for ${data.months} months: lessons, practice exams and insights.`}
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div role="radiogroup" aria-label="Licence" className="flex flex-wrap gap-2">
          {[{ id: "all", name: "All" }, ...data.licenses].map((l) => (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={license === l.id}
              onClick={() => setLicense(l.id)}
              className={cn(
                "h-9 rounded-full border px-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                license === l.id
                  ? "border-primary bg-primary/10 font-medium text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {l.name}
            </button>
          ))}
        </div>
        <div className="relative md:w-64">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a subject"
            aria-label="Find a subject"
            className="h-10 pl-9"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No subjects match.</p>
      ) : (
        <div role="radiogroup" aria-label="Subjects" className="grid gap-3 pb-24 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((s) => {
            const Icon = ICONS[s.icon] ?? Plane
            const isSelected = selected === s.id
            const disabled = s.owned
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-disabled={disabled}
                disabled={disabled}
                onClick={() => setSelected(s.id)}
                className={cn(
                  "relative flex h-full flex-col rounded-xl border bg-card p-4 text-left shadow-e1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40",
                  disabled && "cursor-not-allowed opacity-60 hover:border-border",
                )}
              >
                <span className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium leading-snug text-foreground">{s.name}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {s.licenseType.toUpperCase()} &middot; {s.code}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                      isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </span>
                </span>
                <span className="mt-3 line-clamp-2 text-sm text-muted-foreground">{s.description}</span>
                <span className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-3 text-xs text-muted-foreground">
                  {disabled ? (
                    <Badge variant="secondary" className="font-normal">
                      Already unlocked
                    </Badge>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1">
                        <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                        {s.questionCount > 0 ? `${s.questionCount} questions` : "Questions coming soon"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                        {s.hasLessons ? "Lessons" : "Lessons coming soon"}
                      </span>
                    </>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Confirm bar: appears once something is picked. */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t lg:bottom-0 border-border bg-background/95 backdrop-blur transition-transform motion-reduce:transition-none lg:left-64",
          choice ? "translate-y-0" : "translate-y-full",
        )}
        aria-hidden={!choice}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 lg:px-8">
          <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            {choice ? (
              <>
                Selected: <span className="font-medium text-foreground">{choice.name}</span>
              </>
            ) : null}
          </p>
          <Button className="h-10 gap-2" onClick={() => setConfirmOpen(true)} disabled={!choice} tabIndex={choice ? 0 : -1}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Unlock free
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlock {choice?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              You get lessons, practice exams and insights for {data.months} months. You can only choose one free
              subject, and it can&apos;t be changed later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={claiming}>Keep looking</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                claim()
              }}
              disabled={claiming}
              className="gap-2"
            >
              {claiming && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Unlock it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  )
}
