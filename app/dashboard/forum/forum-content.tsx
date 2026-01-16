"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageSquare, Clock, ChevronRight, Lock, AlertCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Forum {
  id: string
  name: string
  description: string | null
  slug: string
  _count: { threads: number }
  threads: Array<{
    id: string
    title: string
    updatedAt: string
    author: { firstName: string; lastName: string }
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/forum/categories")
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Failed to load forum")
        }
        const data = await res.json()
        setCategories(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load forum")
      } finally {
        setLoading(false)
      }
    }
    fetchCategories()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <h1 className="text-2xl font-bold">Community Forums</h1>
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex items-center gap-3 py-6">
            <Lock className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">{error}</p>
              <p className="text-sm text-muted-foreground">
                Purchase access to at least one subject to join the community.
              </p>
            </div>
            <Link href="/dashboard/pricing" className="ml-auto">
              <Button size="sm">Get Access</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (categories.length === 0) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <h1 className="text-2xl font-bold">Community Forum</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">No Forums Available</h3>
            <p className="text-sm text-muted-foreground">Forums are being set up. Check back soon!</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Community Forum</h1>
          <p className="text-muted-foreground">Connect with fellow student pilots and discuss CPL topics</p>
        </div>
      </div>

      {categories.map((category) => (
        <Card key={category.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{category.name}</CardTitle>
            {category.description && <p className="text-sm text-muted-foreground">{category.description}</p>}
          </CardHeader>
          <CardContent className="space-y-2">
            {category.forums.map((forum) => (
              <Link
                key={forum.id}
                href={`/dashboard/forum/${forum.slug}`}
                className="flex items-center gap-4 rounded-lg border border-border bg-card/50 p-4 transition-colors hover:bg-secondary/50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium">{forum.name}</h3>
                  {forum.description && <p className="truncate text-sm text-muted-foreground">{forum.description}</p>}
                </div>
                <div className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4" />
                    <span>{forum._count.threads}</span>
                  </div>
                  {forum.threads[0] && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span className="max-w-[150px] truncate">
                        {formatDistanceToNow(new Date(forum.threads[0].updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
