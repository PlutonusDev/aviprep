"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow, format } from "date-fns"
import {
  Bell,
  GraduationCap,
  CheckCircle2,
  Trophy,
  ShoppingBag,
  MessageSquare,
  Award,
  Loader2,
  Check,
  Trash2,
  ArrowLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@lib/utils"
import Link from "@/components/meta/link"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link?: string
  isRead: boolean
  createdAt: string
}

const typeIcons: Record<string, typeof Bell> = {
  course_enrolled: GraduationCap,
  exam_completed: CheckCircle2,
  course_completed: Trophy,
  purchase: ShoppingBag,
  message: MessageSquare,
  achievement: Award,
}

const typeLabels: Record<string, string> = {
  course_enrolled: "Course",
  exam_completed: "Exam",
  course_completed: "Achievement",
  purchase: "Purchase",
  message: "Message",
  achievement: "Achievement",
}

const typeColors: Record<string, string> = {
  course_enrolled: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  exam_completed: "text-green-500 bg-green-500/10 border-green-500/20",
  course_completed: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  purchase: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  message: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  achievement: "text-pink-500 bg-pink-500/10 border-pink-500/20",
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "unread">("all")

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications?limit=100")
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      })
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch (error) {
      console.error("Failed to mark notifications as read:", error)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationIds: [notification.id] }),
        })
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
        )
      } catch (error) {
        console.error("Failed to mark notification as read:", error)
      }
    }

    if (notification.link) {
      router.push(notification.link)
    }
  }

  const filteredNotifications = filter === "unread" 
    ? notifications.filter(n => !n.isRead)
    : notifications

  const unreadCount = notifications.filter(n => !n.isRead).length

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = new Date(notification.createdAt)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    let groupKey: string
    if (date.toDateString() === today.toDateString()) {
      groupKey = "Today"
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = "Yesterday"
    } else {
      groupKey = format(date, "MMMM d, yyyy")
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(notification)
    return groups
  }, {} as Record<string, Notification[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <Check className="mr-2 h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Button
          variant={filter === "all" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button
          variant={filter === "unread" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setFilter("unread")}
        >
          Unread
          {unreadCount > 0 && (
            <Badge variant="default" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Notifications */}
      {filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {filter === "unread" 
                ? "You're all caught up!" 
                : "We'll notify you when something happens"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedNotifications).map(([date, items]) => (
            <div key={date}>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">{date}</h3>
              <Card>
                <CardContent className="p-0 divide-y">
                  {items.map((notification) => {
                    const Icon = typeIcons[notification.type] || Bell
                    const colorClass = typeColors[notification.type] || "text-muted-foreground bg-muted"
                    const label = typeLabels[notification.type] || "Notification"
                    
                    return (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={cn(
                          "flex w-full gap-4 p-4 text-left transition-colors hover:bg-muted/50",
                          !notification.isRead && "bg-primary/5"
                        )}
                      >
                        <div className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border",
                          colorClass
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <p className={cn(
                                "text-sm",
                                !notification.isRead ? "font-semibold" : "font-medium"
                              )}>
                                {notification.title}
                              </p>
                              {!notification.isRead && (
                                <span className="h-2 w-2 rounded-full bg-primary" />
                              )}
                            </div>
                            <Badge variant="outline" className="shrink-0 text-xs">
                              {label}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
