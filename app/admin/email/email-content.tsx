"use client"

import React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Mail, Send, Users, Clock, CheckCircle, XCircle, Eye, Upload, Code } from "lucide-react"

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Email</h1>
        <p className="text-muted-foreground">Send emails to users and waitlist members</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Stats Cards */}
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.users}</p>
              <p className="text-sm text-muted-foreground">Registered Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.waitlist}</p>
              <p className="text-sm text-muted-foreground">Waitlist Members</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
              <Mail className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{getRecipientCount()}</p>
              <p className="text-sm text-muted-foreground">Selected Recipients</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compose Email</CardTitle>
          <CardDescription>
            Send custom HTML emails to your users. Use {"{{firstName}}"} for personalization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recipients */}
          <div className="space-y-2">
            <Label>Recipients</Label>
            <Select value={recipients} onValueChange={(v) => setRecipients(v as typeof recipients)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_users">All Registered Users ({stats.users})</SelectItem>
                <SelectItem value="all_waitlist">All Waitlist Members ({stats.waitlist})</SelectItem>
                <SelectItem value="specific">Specific Email Addresses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recipients === "specific" && (
            <div className="space-y-2">
              <Label>Email Addresses</Label>
              <Textarea
                placeholder="Enter email addresses, one per line or comma-separated"
                value={specificEmails}
                onChange={(e) => setSpecificEmails(e.target.value)}
                rows={4}
              />
            </div>
          )}

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Enter email subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* HTML Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>HTML Content</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <label className="cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload HTML
                    <input
                      type="file"
                      accept=".html,.htm"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(true)}
                  disabled={!htmlContent}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>
              </div>
            </div>
            <Tabs defaultValue="code" className="w-full">
              <TabsList>
                <TabsTrigger value="code">
                  <Code className="mr-2 h-4 w-4" />
                  Code
                </TabsTrigger>
              </TabsList>
              <TabsContent value="code">
                <Textarea
                  placeholder="Paste your HTML email content here..."
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  rows={16}
                  className="font-mono text-sm"
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Options */}
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="personalize"
                checked={personalize}
                onCheckedChange={setPersonalize}
              />
              <Label htmlFor="personalize">
                Personalize with {"{{firstName}}"}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="useWrapper"
                checked={useWrapper}
                onCheckedChange={setUseWrapper}
              />
              <Label htmlFor="useWrapper">
                Wrap in AviPrep template
              </Label>
            </div>
          </div>

          {/* Send Button */}
          <div className="flex items-center justify-between border-t pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>Will send to {getRecipientCount()} recipient(s)</span>
            </div>
            <Button
              onClick={() => setShowConfirm(true)}
              disabled={!subject || !htmlContent || getRecipientCount() === 0 || sending}
            >
              {sending ? (
                <>Sending...</>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              Preview how your email will look
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-white">
            <iframe
              srcDoc={htmlContent}
              className="h-[500px] w-full"
              title="Email Preview"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Send</DialogTitle>
            <DialogDescription>
              Are you sure you want to send this email?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subject:</span>
                <span className="font-medium">{subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recipients:</span>
                <span className="font-medium">{getRecipientCount()} people</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Personalized:</span>
                <Badge variant={personalize ? "default" : "secondary"}>
                  {personalize ? "Yes" : "No"}
                </Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend}>
              <Send className="mr-2 h-4 w-4" />
              Send Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Email Sent</DialogTitle>
            <DialogDescription>
              Results of your email campaign
            </DialogDescription>
          </DialogHeader>
          {results && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-green-500/10 p-4 text-center">
                  <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
                  <p className="text-2xl font-bold text-green-500">{results.sent}</p>
                  <p className="text-sm text-muted-foreground">Sent</p>
                </div>
                <div className="rounded-lg bg-red-500/10 p-4 text-center">
                  <XCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
                  <p className="text-2xl font-bold text-red-500">{results.failed}</p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
              </div>
              {results.failed > 0 && (
                <div className="max-h-40 overflow-auto rounded-lg border p-3">
                  <p className="text-sm font-medium mb-2">Failed addresses:</p>
                  {results.results
                    .filter((r) => !r.success)
                    .map((r) => (
                      <div key={r.email} className="text-sm text-muted-foreground">
                        {r.email}: {r.error}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowResults(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
