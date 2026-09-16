"use client"

import React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Mail, Send, Users, Clock, CheckCircle, XCircle, Eye, Upload, Loader2 } from "lucide-react"
import { PageHeader, PageShell } from "@/components/hub/page-primitives"
import { cn } from "@lib/utils"

interface SendResult {
  email: string
  success: boolean
  error?: string
}

export function EmailContent() {
  const [subject, setSubject] = useState("")
  const [htmlContent, setHtmlContent] = useState("")
  const [recipients, setRecipients] = useState<"all_users" | "all_waitlist" | "specific">("all_users")
  const [specificEmails, setSpecificEmails] = useState("")
  const [personalize, setPersonalize] = useState(false)
  const [useWrapper, setUseWrapper] = useState(true)
  const [sending, setSending] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<{ sent: number; failed: number; results: SendResult[] } | null>(null)
  const [stats, setStats] = useState({ users: 0, waitlist: 0 })

  useEffect(() => {
    // Fetch user and waitlist counts
    async function fetchStats() {
      try {
        const [usersRes, statsRes] = await Promise.all([
          fetch("/api/admin/members?page=1&limit=1"),
          fetch("/api/admin/stats"),
        ])
        const usersData = await usersRes.json()
        const statsData = await statsRes.json()
        setStats({
          users: usersData.total || 0,
          waitlist: statsData.waitlistCount || 0,
        })
      } catch (error) {
        console.error("Failed to fetch stats:", error)
      }
    }
    fetchStats()
  }, [])

  const getRecipientCount = () => {
    if (recipients === "all_users") return stats.users
    if (recipients === "all_waitlist") return stats.waitlist
    if (recipients === "specific") {
      const emails = specificEmails.split(/[,\n]/).filter((e) => e.trim())
      return emails.length
    }
    return 0
  }

  const handleSend = async () => {
    setShowConfirm(false)
    setSending(true)

    try {
      const emailList = recipients === "specific"
        ? specificEmails.split(/[,\n]/).map((e) => e.trim()).filter(Boolean)
        : []

      const response = await fetch("/api/admin/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          html: htmlContent,
          recipients,
          specificEmails: emailList,
          personalize,
          useWrapper,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send emails")
      }

      setResults(data)
      setShowResults(true)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to send emails")
    } finally {
      setSending(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setHtmlContent(content)
    }
    reader.readAsText(file)
  }

  const recipientCount = getRecipientCount()
  const audiences = [
    { id: "all_users", label: "Members", detail: `${stats.users.toLocaleString()} people`, icon: Users },
    { id: "all_waitlist", label: "Waitlist", detail: `${stats.waitlist.toLocaleString()} people`, icon: Clock },
    { id: "specific", label: "Specific people", detail: "Paste addresses", icon: Mail },
  ] as const

  return (
    <PageShell>
      <PageHeader title="Email" description="Send a one-off email to members or the waitlist." />

      <div className="grid gap-6 xl:grid-cols-5">
        <section className="space-y-6 rounded-xl border border-border bg-card p-4 shadow-e1 sm:p-6 xl:col-span-3" aria-label="Compose">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">To</legend>
            <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
              {audiences.map((a) => {
                const active = recipients === a.id
                return (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setRecipients(a.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                    )}
                  >
                    <a.icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">{a.label}</span>
                      <span className="block text-xs text-muted-foreground" data-tabular>
                        {a.detail}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          {recipients === "specific" && (
            <div className="space-y-2">
              <Label htmlFor="specific-emails">Addresses</Label>
              <Textarea
                id="specific-emails"
                placeholder="One per line, or separated by commas"
                value={specificEmails}
                onChange={(e) => setSpecificEmails(e.target.value)}
                rows={4}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="h-11" />
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="html-content">HTML</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild className="h-8">
                  <label className="cursor-pointer">
                    <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Upload file
                    <input type="file" accept=".html,.htm" className="sr-only" onChange={handleFileUpload} />
                  </label>
                </Button>
                <Button variant="outline" size="sm" className="h-8 xl:hidden" onClick={() => setShowPreview(true)} disabled={!htmlContent}>
                  <Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Preview
                </Button>
              </div>
            </div>
            <Textarea
              id="html-content"
              placeholder="<p>Hi {{firstName}},</p>"
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              rows={16}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="personalize" className="font-normal">
                Replace {"{{firstName}}"} with each person&apos;s name
              </Label>
              <Switch id="personalize" checked={personalize} onCheckedChange={setPersonalize} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="useWrapper" className="font-normal">
                Use the AviPrep email template
              </Label>
              <Switch id="useWrapper" checked={useWrapper} onCheckedChange={setUseWrapper} />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground" data-tabular>
              {recipientCount === 0 ? "No recipients yet" : `Sends to ${recipientCount.toLocaleString()} ${recipientCount === 1 ? "person" : "people"}`}
            </p>
            <Button
              onClick={() => setShowConfirm(true)}
              disabled={!subject || !htmlContent || recipientCount === 0 || sending}
              className="h-10 gap-2"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
              {sending ? "Sending" : "Review and send"}
            </Button>
          </div>
        </section>

        <section className="hidden xl:col-span-2 xl:block" aria-label="Preview">
          <div className="sticky top-20 overflow-hidden rounded-xl border border-border bg-card shadow-e1">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <p className="text-sm font-medium text-foreground">Preview</p>
              <p className="truncate pl-4 text-xs text-muted-foreground">{subject || "No subject"}</p>
            </div>
            {htmlContent ? (
              <iframe srcDoc={htmlContent} sandbox="" className="h-[640px] w-full bg-white" title="Email preview" />
            ) : (
              <p className="flex h-[640px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
                Your email shows here as you write it.
              </p>
            )}
          </div>
        </section>
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-auto">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
            <DialogDescription>{subject || "No subject"}</DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-lg border border-border bg-white">
            <iframe srcDoc={htmlContent} sandbox="" className="h-[500px] w-full" title="Email preview" />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send this email?</DialogTitle>
            <DialogDescription>This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <dl className="space-y-2 rounded-lg bg-muted/60 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Subject</dt>
              <dd className="truncate font-medium text-foreground">{subject}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Recipients</dt>
              <dd className="font-medium text-foreground" data-tabular>
                {recipientCount.toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Personalised</dt>
              <dd className="font-medium text-foreground">{personalize ? "Yes" : "No"}</dd>
            </div>
          </dl>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend} className="gap-2">
              <Send className="h-4 w-4" aria-hidden="true" />
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sent</DialogTitle>
            <DialogDescription>Here&apos;s how it went.</DialogDescription>
          </DialogHeader>
          {results && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-center">
                  <CheckCircle className="mx-auto mb-2 h-6 w-6 text-success" aria-hidden="true" />
                  <p className="text-2xl font-semibold text-foreground" data-tabular>
                    {results.sent}
                  </p>
                  <p className="text-sm text-muted-foreground">Sent</p>
                </div>
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-center">
                  <XCircle className="mx-auto mb-2 h-6 w-6 text-destructive" aria-hidden="true" />
                  <p className="text-2xl font-semibold text-foreground" data-tabular>
                    {results.failed}
                  </p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
              </div>
              {results.failed > 0 && (
                <div className="max-h-40 overflow-auto rounded-lg border border-border p-3">
                  <p className="mb-2 text-sm font-medium text-foreground">Didn&apos;t send</p>
                  {results.results
                    .filter((r) => !r.success)
                    .map((r) => (
                      <p key={r.email} className="text-sm text-muted-foreground">
                        {r.email}: {r.error}
                      </p>
                    ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowResults(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
