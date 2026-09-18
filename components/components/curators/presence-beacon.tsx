"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { useUser } from "@lib/user-context"

/**
 * Tells the admin roster a curator is here, and what they're on.
 *
 * A beat goes out when they arrive, when they change page, when they come back
 * to the tab, and once a minute while it's in front of them. It stops while the
 * tab is hidden, which is what makes "idle" mean anything.
 */
const BEAT_MS = 60_000

/** The last beat, so a page change doesn't fire a second one straight away. */
const lastAt = { current: 0 }

/** What the current page wants said about it, beyond its URL. */
let detail: string | null = null
const listeners = new Set<() => void>()

function setDetail(next: string | null) {
  if (detail === next) return
  detail = next
  for (const notify of listeners) notify()
}

/**
 * Publishes a line of context from a page, e.g. the subject being written for.
 * Cleared when the page unmounts, so a stale subject never follows them around.
 */
export function useStudioActivity(text: string | null | undefined) {
  const value = text?.trim() || null
  useEffect(() => {
    setDetail(value)
    return () => setDetail(null)
  }, [value])
}

export function CuratorPresence() {
  const { user } = useUser()
  const pathname = usePathname()
  const isCurator = !!user?.isCurator
  // Re-beats when a page publishes different context.
  const [tick, setTick] = useState(0)
  const sent = useRef("")

  useEffect(() => {
    if (!isCurator) return
    const listener = () => setTick((n) => n + 1)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [isCurator])

  useEffect(() => {
    if (!isCurator) return

    const beat = (force = false) => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return
      const key = `${pathname}|${detail ?? ""}`
      const now = Date.now()
      // Skip a repeat of the same page inside a beat, but never a real change.
      if (!force && key === sent.current && now - lastAt.current < BEAT_MS - 1_000) return
      sent.current = key
      lastAt.current = now
      fetch("/api/curators/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname, detail }),
        keepalive: true,
      }).catch(() => {})
    }

    beat()
    const timer = setInterval(() => beat(true), BEAT_MS)
    const onVisible = () => beat()
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [isCurator, pathname, tick])

  return null
}
