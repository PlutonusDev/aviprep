"use client"

import { useEffect, useState } from "react"
import { Loader2, MailWarning } from "lucide-react"
import { toast } from "sonner"
import { useUser } from "@lib/user-context"

/** "joshua@aviprep.com.au" -> "jo••••@a••••.com.au": recognisable, not readable over a shoulder. */
export function maskEmail(email: string) {
  const [local, domain] = email.split("@")
  if (!domain) return email
  const dot = domain.indexOf(".")
  const name = dot === -1 ? domain : domain.slice(0, dot)
  const tld = dot === -1 ? "" : domain.slice(dot)
  const keep = local.length <= 2 ? 1 : 2
  return `${local.slice(0, keep)}••••@${name.slice(0, 1)}••••${tld}`
}

/**
 * Reminder to confirm the account's email address. Deliberately not a gate and
 * not dismissible: it stays until the link is clicked. Rendered by the hub
 * layout, so exams and lessons (which are immersive) never show it.
 */
export function EmailVerificationBanner() {
  const { user, isLoading, refresh } = useUser()
  const [sending, setSending] = useState(false)
  const [wait, setWait] = useState(0)
  const [sent, setSent] = useState(false)
  const [expired, setExpired] = useState(false)

  // Result of clicking the link: /dashboard?email=verified|expired
  useEffect(() => {
    const url = new URL(window.location.href)
    const status = url.searchParams.get("email")
    if (!status) return
    if (status === "verified") {
      toast.success("Email confirmed. Thanks!", { id: "email-verified" })
      refresh()
    } else if (status === "expired") {
      setExpired(true)
    }
    url.searchParams.delete("email")
    window.history.replaceState(null, "", url.pathname + url.search + url.hash)
  }, [refresh])

  useEffect(() => {
    if (wait <= 0) return
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000)
    return () => window.clearTimeout(t)
  }, [wait])

  if (isLoading || !user || user.emailVerifiedAt) return null

  async function resend() {
    setSending(true)
    try {
      const res = await fetch("/api/auth/verify-email", { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (data.verified) return refresh()
      if (!res.ok) {
        if (data.retryAfter) setWait(data.retryAfter)
        toast.error(data.error || "Couldn't send the email.")
        return
      }
      setSent(true)
      setExpired(false)
      setWait(data.retryAfter ?? 60)
    } catch {
      toast.error("Couldn't send the email. Check your connection.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div role="status" className="border-b border-warning/30 bg-warning/10">
      <div className="flex flex-col gap-2 px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:gap-3 lg:px-6">
        <p className="flex min-w-0 flex-1 items-start gap-2 text-foreground sm:items-center">
          <MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-warning sm:mt-0" aria-hidden="true" />
          <span className="min-w-0 [overflow-wrap:anywhere]">
            {expired ? (
              <>That confirmation link has expired. Send a new one to {maskEmail(user.email)}.</>
            ) : sent ? (
              <>
                Sent. Check <span className="font-medium">{maskEmail(user.email)}</span> for the link (and your spam folder).
              </>
            ) : (
              <>
                Confirm your email address. We sent a link to <span className="font-medium">{maskEmail(user.email)}</span>.
              </>
            )}
          </span>
        </p>
        <button
          type="button"
          onClick={resend}
          disabled={sending || wait > 0}
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md px-2 py-1 font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60 sm:self-auto"
        >
          {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          {wait > 0 ? <span data-tabular>Resend in {wait}s</span> : sending ? "Sending..." : "Resend email"}
        </button>
      </div>
    </div>
  )
}
