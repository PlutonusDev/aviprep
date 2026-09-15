"use client"

import { useEffect, useState } from "react"

export interface RegistrationStatus {
  /** null while loading. */
  open: boolean | null
  message: string
}

/** Whether new sign-ups are allowed, as set in the admin panel. */
export function useRegistrationStatus(): RegistrationStatus {
  const [status, setStatus] = useState<RegistrationStatus>({ open: null, message: "" })

  useEffect(() => {
    let cancelled = false
    fetch("/api/site/registration")
      .then((r) => (r.ok ? r.json() : { open: true, message: "" }))
      .then((d) => !cancelled && setStatus({ open: d.open !== false, message: d.message ?? "" }))
      .catch(() => !cancelled && setStatus({ open: true, message: "" }))
    return () => {
      cancelled = true
    }
  }, [])

  return status
}
