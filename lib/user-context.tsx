"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback, useMemo } from "react"
import useSWR from "swr"

interface User {
  profilePicture: any
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  arn: string
  isAdmin: boolean
  /** Content curator: admin panel access limited to courses and questions. */
  isCurator?: boolean
  isFlightSchoolAdmin: boolean
  hasBundle: boolean
  bundleExpiry: string | null
  createdAt: string
  /** Null until the welcome tour has been finished or skipped. */
  onboardedAt: string | null
  /** Null until the member clicks the link in the verification email. */
  emailVerifiedAt: string | null
  /** A new member who hasn't picked their free subject yet. */
  canClaimFreeSubject: boolean
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

const EMPTY_PURCHASES: Purchase[] = []
const EMPTY_ATTEMPTS: ExamAttempt[] = []
const EMPTY_WEAK_POINTS: WeakPoint[] = []

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

      // Granted by the student's school, directly or through a group.
      const grants = data.schoolGrants
      if (grants?.individual?.includes(subjectId) || grants?.group?.includes(subjectId)) {
        return true
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

  // Without this the provider handed every consumer a new object on each render,
  // re-rendering the whole dashboard tree even when nothing had changed.
  const value: UserContextType = useMemo(
    () => ({
      user: data?.user || null,
      purchases: data?.purchases || EMPTY_PURCHASES,
      examAttempts: data?.examAttempts || EMPTY_ATTEMPTS,
      weakPoints: data?.weakPoints || EMPTY_WEAK_POINTS,
      stats: data?.stats || null,
      isLoading: isLoading || isLoggingOut,
      error: error || null,
      refresh: () => mutate(),
      logout,
      hasAccessToSubject,
    }),
    [data, isLoading, isLoggingOut, error, mutate, logout, hasAccessToSubject],
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
