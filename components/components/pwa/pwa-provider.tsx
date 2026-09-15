"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

interface PwaContext {
  /** Chrome/Edge have offered installation and we can trigger it. */
  canInstall: boolean
  /** Running as the installed app. */
  isStandalone: boolean
  /** iOS Safari: no install event, so people add it from the Share menu. */
  isIos: boolean
  install: () => Promise<"accepted" | "dismissed" | "unavailable">
}

const Ctx = createContext<PwaContext>({
  canInstall: false,
  isStandalone: false,
  isIos: false,
  install: async () => "unavailable",
})

export const usePwa = () => useContext(Ctx)

/**
 * Registers the service worker and keeps hold of Chrome's install event.
 *
 * We deliberately do NOT call preventDefault() on `beforeinstallprompt`, so
 * Chrome still shows its own install prompt. The event is also kept, so our
 * "Install app" buttons can open the same dialog on demand.
 */
export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    const standaloneQuery = window.matchMedia("(display-mode: standalone)")
    const updateStandalone = () =>
      setIsStandalone(standaloneQuery.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true)
    updateStandalone()
    standaloneQuery.addEventListener("change", updateStandalone)

    const ua = navigator.userAgent
    setIsIos(/iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1))

    const onPrompt = (e: Event) => setDeferred(e as BeforeInstallPromptEvent)
    const onInstalled = () => setDeferred(null)
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)

    // In development the worker's caching gets in the way of hot reload, so it
    // only registers in production unless NEXT_PUBLIC_ENABLE_SW=1.
    const enableSw = process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_ENABLE_SW === "1"
    if (enableSw && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => console.error("Service worker failed:", err))
    }

    return () => {
      standaloneQuery.removeEventListener("change", updateStandalone)
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferred) return "unavailable" as const
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    // The event can only be used once.
    setDeferred(null)
    return outcome
  }, [deferred])

  const value = useMemo(
    () => ({ canInstall: !!deferred && !isStandalone, isStandalone, isIos, install }),
    [deferred, isStandalone, isIos, install],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
