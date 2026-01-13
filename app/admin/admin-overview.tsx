"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, HelpCircle, DollarSign, TrendingUp } from "lucide-react"

interface Stats {
  totalMembers: number
  totalQuestions: number
  totalRevenue: number
  activeSubscriptions: number
}

export function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats")
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const statCards = [
    {
      title: "Total Members",
      value: stats?.totalMembers ?? 0,
      icon: Users,
      description: "Registered users",
    },
    {
      title: "Total Questions",
      value: stats?.totalQuestions ?? 0,
      icon: HelpCircle,
      description: "In question bank",
    },
    {
      title: "Revenue (AUD)",
      value: `$${((stats?.totalRevenue ?? 0) / 100).toLocaleString()}`,
      icon: DollarSign,
      description: "Total earnings",
    },
    {
      title: "Active Bundles",
      value: stats?.activeSubscriptions ?? 0,
      icon: TrendingUp,
      description: "Active subscriptions",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard Overview</h2>
        <p className="text-muted-foreground">Manage the AviPrep platform</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <a
              href="/admin/questions/generate"
              className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <HelpCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Generate Questions with AI</p>
                <p className="text-sm text-muted-foreground">Use AI to create new exam questions</p>
              </div>
            </a>
            <a
              href="/admin/members"
              className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Manage Members</p>
                <p className="text-sm text-muted-foreground">View and edit user accounts</p>
              </div>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest platform events</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Activity feed will appear here once the platform is live.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
