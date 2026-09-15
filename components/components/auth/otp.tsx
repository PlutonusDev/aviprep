"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@lib/utils"

export const OTP_LENGTH = 6

/**
 * The 6-digit code field. One input rather than six boxes: it pastes cleanly,
 * works with password managers and screen readers, and `one-time-code` lets
 * iOS and Android offer the code straight from the text message.
 */
export function OtpInput({
  id = "otp",
  value,
  onChange,
  onComplete,
  error,
  disabled,
  autoFocus = true,
  describedBy,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  /** Called once all digits are in, e.g. to submit straight away. */
  onComplete?: (value: string) => void
  error?: string | null
  disabled?: boolean
  autoFocus?: boolean
  describedBy?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const completeRef = useRef(onComplete)
  completeRef.current = onComplete
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  // Android Chrome: read the code from the incoming SMS (WebOTP), if supported.
  useEffect(() => {
    if (typeof window === "undefined" || !("OTPCredential" in window)) return
    const controller = new AbortController()
    ;(navigator.credentials as any)
      .get({ otp: { transport: ["sms"] }, signal: controller.signal })
      .then((otp: { code?: string } | null) => {
        const code = otp?.code?.replace(/\D/g, "").slice(0, OTP_LENGTH)
        if (code?.length === OTP_LENGTH) {
          onChangeRef.current(code)
          completeRef.current?.(code)
        }
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH)
    onChange(next)
    if (next.length === OTP_LENGTH && value.length !== OTP_LENGTH) completeRef.current?.(next)
  }

  const errorId = error ? `${id}-error` : undefined

  return (
    <div className="space-y-2">
      <Input
        ref={inputRef}
        id={id}
        name="one-time-code"
        value={value}
        onChange={handle}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={OTP_LENGTH}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={[errorId, describedBy].filter(Boolean).join(" ") || undefined}
        placeholder="••••••"
        className={cn(
          "h-14 text-center font-mono text-2xl tracking-[0.5em] indent-[0.5em] placeholder:tracking-[0.5em] placeholder:text-muted-foreground/40",
        )}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * "Send a new code" with a countdown. Returns what the server said so the
 * caller can react (e.g. restart when the challenge has timed out).
 */
export function ResendCode({
  challenge,
  initialWait = 60,
  onSent,
  onError,
  className,
}: {
  challenge: string | null
  initialWait?: number
  onSent?: () => void
  onError?: (message: string, restart: boolean) => void
  className?: string
}) {
  const [wait, setWait] = useState(initialWait)
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (wait <= 0) return
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000)
    return () => window.clearTimeout(t)
  }, [wait])

  async function resend() {
    if (!challenge) return
    setSending(true)
    setNotice(null)
    try {
      const res = await fetch("/api/auth/otp/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.retryAfter) setWait(data.retryAfter)
        onError?.(data.error || "Couldn't send a new code.", !!data.restart)
        return
      }
      setWait(60)
      setNotice("New code sent.")
      onSent?.()
    } catch {
      onError?.("Couldn't send a new code. Check your connection.", false)
    } finally {
      setSending(false)
    }
  }

  return (
    <p className={cn("text-sm text-muted-foreground", className)} aria-live="polite">
      {notice && <span className="mr-1 text-foreground">{notice}</span>}
      {wait > 0 ? (
        <span data-tabular>Didn&apos;t get it? You can resend in {wait}s.</span>
      ) : (
        <>
          Didn&apos;t get it?{" "}
          <button
            type="button"
            onClick={resend}
            disabled={sending || !challenge}
            className="font-medium text-primary hover:underline disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send a new code"}
          </button>
        </>
      )}
    </p>
  )
}
