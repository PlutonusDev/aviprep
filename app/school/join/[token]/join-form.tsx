"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Three ways this ends, decided on the server and handed down:
 *   already signed in as the invited address  -> one button
 *   an account exists but they aren't in it   -> sign in first
 *   no account                                -> make one here
 */
export function JoinForm({
  token,
  email,
  firstName,
  lastName,
  hasAccount,
  signedInAs,
}: {
  token: string
  email: string
  firstName: string | null
  lastName: string | null
  hasAccount: boolean
  signedInAs: string | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    firstName: firstName ?? "",
    lastName: lastName ?? "",
    phone: "",
    arn: "",
    password: "",
  })

  const isThem = signedInAs?.toLowerCase() === email.toLowerCase()
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function accept(body: Record<string, unknown>) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/school/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...body }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return setError(data.error || "That didn't work. Try again.")
      router.push("/school")
    } finally {
      setBusy(false)
    }
  }

  const problem = error && (
    <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-foreground">
      {error}
    </p>
  )

  /* Signed in as someone else: nothing they can do until they switch. */
  if (signedInAs && !isThem) {
    return (
      <>
        <p className="mt-5 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm text-foreground">
          You&rsquo;re signed in as {signedInAs}. This invite is for {email}.
        </p>
        <Link href={`/login?redirect=/school/join/${token}`} className="mt-4 block">
          <Button className="w-full">Sign in as {email}</Button>
        </Link>
      </>
    )
  }

  if (isThem || hasAccount) {
    return (
      <>
        {isThem ? (
          <Button className="mt-6 w-full gap-2" disabled={busy} onClick={() => accept({})}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Accept and open the panel
          </Button>
        ) : (
          <Link href={`/login?redirect=/school/join/${token}`} className="mt-6 block">
            <Button className="w-full">Sign in to accept</Button>
          </Link>
        )}
        {problem}
      </>
    )
  }

  /* No account yet. */
  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        accept(form)
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" value={form.firstName} onChange={set("firstName")} autoComplete="given-name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" value={form.lastName} onChange={set("lastName")} autoComplete="family-name" required />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Mobile</Label>
        <Input id="phone" type="tel" inputMode="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" placeholder="04xx xxx xxx" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="arn">ARN</Label>
        <Input id="arn" value={form.arn} onChange={set("arn")} inputMode="numeric" placeholder="Aviation Reference Number" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" value={form.password} onChange={set("password")} autoComplete="new-password" minLength={8} required />
        <p className="text-xs text-muted-foreground">At least 8 characters. You&rsquo;ll sign in with {email}.</p>
      </div>

      {problem}

      <Button type="submit" className="w-full gap-2" disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Create the account and join
      </Button>
    </form>
  )
}
