"use client"

import { useState } from "react"

export type LoginStage = "password" | "code"

/**
 * Shared sign-in logic for the web and app login screens: password first, then
 * the texted code when the device isn't trusted.
 */
export function useLogin({ onSignedIn }: { onSignedIn: () => void }) {
  const [stage, setStage] = useState<LoginStage>("password")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [remember, setRemember] = useState(true)
  const [challenge, setChallenge] = useState<string | null>(null)
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null)
  const [resendWait, setResendWait] = useState(60)
  const [error, setError] = useState<string | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submitPassword() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || "Couldn't sign you in.")
        return
      }
      if (data.otpRequired) {
        setChallenge(data.challenge)
        setMaskedPhone(data.maskedPhone)
        setResendWait(data.retryAfter ?? 60)
        setCode("")
        setCodeError(null)
        setStage("code")
        return
      }
      onSignedIn()
    } catch {
      setError("Couldn't reach the server. Check your connection.")
    } finally {
      setLoading(false)
    }
  }

  async function submitCode(value = code) {
    if (value.length !== 6 || loading) {
      if (value.length !== 6) setCodeError("Enter the 6-digit code.")
      return
    }
    setLoading(true)
    setCodeError(null)
    try {
      const res = await fetch("/api/auth/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge, code: value, remember }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.restart) return backToPassword(data.error)
        setCodeError(data.error || "That code isn't right.")
        setCode("")
        return
      }
      onSignedIn()
    } catch {
      setCodeError("Couldn't reach the server. Check your connection.")
    } finally {
      setLoading(false)
    }
  }

  function backToPassword(message?: string) {
    setStage("password")
    setChallenge(null)
    setCode("")
    setCodeError(null)
    setError(message ?? null)
  }

  return {
    stage,
    email,
    setEmail,
    password,
    setPassword,
    code,
    setCode,
    remember,
    setRemember,
    challenge,
    maskedPhone,
    resendWait,
    error,
    setError,
    codeError,
    setCodeError,
    loading,
    submitPassword,
    submitCode,
    backToPassword,
  }
}
