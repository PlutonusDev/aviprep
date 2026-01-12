"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback } from "react"
import useSWR from "swr"

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  arn: string
  hasBundle: boolean
  bundleExpiry: string | null
  createdAt: string
}

interface Purchase {
  id: string
  subjectId: string
  subjectName: string
  subjectCode: string
  purchaseType: string
  hasPrinting: boolean
  hasAiInsights: boolean
  expiresAt: string
}

interface ExamAttempt {
  id: string
  subjectId: string
  subjectName: string
  score: number
  totalQuestions: number
  correctAnswers: number
  timeSpentMins: number
  passed: boolean
  completedAt: string
}

interface WeakPoint {
  id: string
  topic: string
  subjectId: string
  subjectName: string
  accuracy: number
  questionsAttempted: number
  recommendation: string
  priority: "high" | "medium" | "low"
}

interface Stats {
  totalExamsTaken: number
  averageScore: number
  studyStreak: number
  totalStudyHours: number
  questionsAnswered: number
  correctAnswers: number
}

interface UserContextType {
  user: User | null
  purchases: Purchase[]
  examAttempts: ExamAttempt[]
  weakPoints: WeakPoint[]
  stats: Stats | null
  isLoading: boolean
  error: Error | null
  refresh: () => void
  logout: () => Promise<void>
  hasAccessToSubject: (subjectId: string) => boolean
}

const UserContext = createContext<UserContextType | null>(null)

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch")
    return res.json()
  })

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data, error, isLoading, mutate } = useSWR("/api/auth/me", fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const logout = useCallback(async () => {
    setIsLoggingOut(true)
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/login"
  }, [])

  const hasAccessToSubject = useCallback(
    (subjectId: string) => {
      if (!data) return false

      // Bundle gives access to all subjects
      if (data.user?.hasBundle && data.user?.bundleExpiry) {
        const expiry = new Date(data.user.bundleExpiry)
        if (expiry > new Date()) return true
      }

      // Check individual purchases
      const purchase = data.purchases?.find((p: Purchase) => p.subjectId === subjectId)
      if (purchase) {
        const expiry = new Date(purchase.expiresAt)
        return expiry > new Date()
      }

      return false
    },
    [data],
  )

  const value: UserContextType = {
    user: data?.user || null,
    purchases: data?.purchases || [],
    examAttempts: data?.examAttempts || [],
    weakPoints: data?.weakPoints || [],
    stats: data?.stats || null,
    isLoading: isLoading || isLoggingOut,
    error: error || null,
    refresh: () => mutate(),
    logout,
    hasAccessToSubject,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
