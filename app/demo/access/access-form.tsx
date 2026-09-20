"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { KeyRound, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * The code arrives two ways: clicked from the email, where ?c= fills it in and
 * submits, or typed by someone reading it off a printout.
 */
export function AccessForm() {
  const router = useRouter()
  const params = useSearchParams()
  const fromLink = params.get("c") ?? ""

  const [code, setCode] = useState(fromLink)
  const [busy, setBusy] = useState(!!fromLink)
  const [error, setError] = useState<string | null>(null)
  const tried = useRef(false)

  async function submit(value: string) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/demo/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || "That code doesn't work.")
        setBusy(false)
        return
      }
      router.replace("/demo")
    } catch {
      setError("Something went wrong. Try again.")
      setBusy(false)
    }
  }

  // A link straight from the email shouldn't ask twice.
  useEffect(() => {
    if (fromLink && !tried.current) {
      tried.current = true
      submit(fromLink)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromLink])

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-e1 sm:p-8">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
        <KeyRound className="h-5 w-5 text-primary" aria-hidden="true" />
      </span>

      <h1 className="mt-5 text-xl font-semibold text-foreground">AviPrep demo</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">Enter the code we emailed you.</p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (code.trim()) submit(code)
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="demo-code" className="sr-only">
            Access code
          </Label>
          <Input
            id="demo-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus={!fromLink}
            autoComplete="off"
            spellCheck={false}
            placeholder="XXXX-XXXX"
            aria-invalid={error ? true : undefined}
            className="h-12 text-center font-mono text-lg uppercase tracking-[0.2em]"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-foreground">
            {error}
          </p>
        )}

        <Button type="submit" className="h-11 w-full gap-2" disabled={busy || !code.trim()}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Open the demo
        </Button>
      </form>

      <p className="mt-6 border-t border-border pt-5 text-sm text-muted-foreground">
        Haven&rsquo;t got one?{" "}
        <Link href="/#flight-schools" className="font-medium text-primary hover:underline">
          Ask for access
        </Link>
      </p>
    </div>
  )
}
