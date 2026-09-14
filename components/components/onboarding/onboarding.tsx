"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { useUser } from "@lib/user-context"
import { useTenant } from "@lib/tenant-context"
import { Tour } from "./tour"
import { MAIN_TOUR, STUDENT_TOUR } from "./tour-steps"

/**
 * Shows the welcome tour once per account.
 *
 * Only on the dashboard: the tour points at the sidebar and the resume card, so
 * running it anywhere else would spotlight things that are not there. It also
 * waits for loading to finish, or it would resolve its steps against a skeleton
 * and drop most of them.
 */
export function Onboarding() {
  const pathname = usePathname()
  const { user, isLoading: userLoading, refresh } = useUser()
  const { isWhitelabeled, disabledFeatures, isLoading: tenantLoading } = useTenant()
  const [open, setOpen] = useState(false)
  const [started, setStarted] = useState(false)

  const ready = !userLoading && !tenantLoading && !!user && pathname === "/dashboard"

  // Local fallback: if the server could not record completion, at least do not
  // reopen the tour on this device every time the dashboard loads.
  const seenLocally =
    typeof window !== "undefined" && window.localStorage?.getItem("aviprep:toured") === "1"

  const needsTour = ready && !user.onboardedAt && !seenLocally

  useEffect(() => {
    if (!needsTour || started) return
    // One frame so the dashboard has painted its cards before we measure them.
    const id = requestAnimationFrame(() => {
      setStarted(true)
      setOpen(true)
    })
    return () => cancelAnimationFrame(id)
  }, [needsTour, started])

  // Listen for a manual replay from Settings.
  useEffect(() => {
    const replay = () => {
      setStarted(true)
      setOpen(true)
    }
    window.addEventListener("aviprep:start-tour", replay)
    return () => window.removeEventListener("aviprep:start-tour", replay)
  }, [])

  const finish = useCallback(async () => {
    setOpen(false)
    try {
      window.localStorage?.setItem("aviprep:toured", "1")
    } catch {
      // Private browsing and the like; the server record is the real one.
    }
    try {
      const res = await fetch("/api/user/onboarding", { method: "POST" })
      if (res.ok) refresh()
      else console.error("Could not record onboarding completion:", res.status)
    } catch (e) {
      console.error("Could not record onboarding completion:", e)
    }
  }, [refresh])

  if (!open) return null

  return (
    <Tour
      steps={isWhitelabeled ? STUDENT_TOUR : MAIN_TOUR}
      disabledFeatures={disabledFeatures}
      onClose={finish}
    />
  )
}
