"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronRight, MessagesSquare, Search } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  EmptyState,
  LoadError,
  PageHeader,
  PageShell,
  SectionHeading,
} from "@/components/hub/page-primitives"
import { ForumLocked, fullName, timeAgo } from "@/components/forum/forum-ui"

interface Forum {
  id: string
  name: string
  description: string | null
  slug: string
  _count: { threads: number }
  threads: Array<{
    id: string
    title: string
    slug: string
    updatedAt: string
    author: { firstName: string; lastName: string } | null
  }>
}

interface Category {
  id: string
  name: string
  description: string | null
  slug: string
  forums: Forum[]
}

export default function ForumContent() {
  const [categories, setCategories] = useState<Category[]>([])
  const [status, setStatus] = useState<"loading" | "ready" | "locked" | "error">("loading")
  const [query, setQuery] = useState("")

  useEffect(() => {
    let cancelled = false
    fetch("/api/forum/categories")
      .then(async (res) => {
        if (cancelled) return
        if (res.status === 403) return setStatus("locked")
        if (!res.ok) throw new Error(String(res.status))
        setCategories(await res.json())
        setStatus("ready")
      })
      .catch(() => !cancelled && setStatus("error"))
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return categories
    return categories
      .map((c) => ({
        ...c,
        forums: c.forums.filter(
          (f) =>
            f.name.toLowerCase().includes(q) ||
            f.description?.toLowerCase().includes(q) ||
            c.name.toLowerCase().includes(q),
        ),
      }))
      .filter((c) => c.forums.length > 0)
  }, [categories, query])

  if (status === "locked") return <ForumLocked />
  if (status === "error") return <LoadError title="Couldn't load the forums" message="Try again in a moment." />

  const forumCount = categories.reduce((n, c) => n + c.forums.length, 0)

  return (
    <PageShell>
      <PageHeader title="Forums" description="Talk theory with other student pilots.">
        {forumCount > 6 && (
          <div className="relative w-full md:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              aria-label="Find a forum"
              placeholder="Find a forum"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 pl-9"
            />
          </div>
        )}
      </PageHeader>

      {status === "loading" ? (
        <div className="space-y-8">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-56 rounded-xl" />
            </div>
          ))}
        </div>
      ) : forumCount === 0 ? (
        <EmptyState icon={MessagesSquare} title="No forums yet" description="Check back soon." />
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No forums match &ldquo;{query}&rdquo;.</p>
      ) : (
        filtered.map((category) => (
          <section key={category.id} aria-labelledby={`cat-${category.id}`}>
            <div id={`cat-${category.id}`}>
              <SectionHeading title={category.name} description={category.description ?? undefined} />
            </div>
            <Card className="overflow-hidden shadow-e1">
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {category.forums.map((forum) => (
                    <ForumRow key={forum.id} forum={forum} />
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        ))
      )}
    </PageShell>
  )
}

function ForumRow({ forum }: { forum: Forum }) {
  const latest = forum.threads[0]
  const count = forum._count.threads

  return (
    <li className="group relative flex items-center gap-4 p-4 transition-colors hover:bg-muted/40 has-[a:focus-visible]:bg-muted/40 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-inset has-[a:focus-visible]:ring-ring">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <MessagesSquare className="h-5 w-5 text-primary" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <Link
          href={`/dashboard/forum/${forum.slug}`}
          className="font-medium text-foreground after:absolute after:inset-0 focus-visible:outline-none"
        >
          {forum.name}
        </Link>
        {forum.description && <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{forum.description}</p>}
        {/* Latest activity moves under the name on small screens. */}
        {latest && (
          <p className="mt-1 truncate text-xs text-muted-foreground md:hidden">
            Latest: {latest.title} &middot; {timeAgo(latest.updatedAt)}
          </p>
        )}
      </div>

      <div className="hidden w-60 shrink-0 md:block">
        {latest ? (
          <>
            <p className="truncate text-sm text-foreground">{latest.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {fullName(latest.author)} &middot; {timeAgo(latest.updatedAt)}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No threads yet</p>
        )}
      </div>

      <div className="w-16 shrink-0 text-right">
        <p className="font-semibold text-foreground" data-tabular>
          {count}
        </p>
        <p className="text-xs text-muted-foreground">{count === 1 ? "thread" : "threads"}</p>
      </div>

      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </li>
  )
}
