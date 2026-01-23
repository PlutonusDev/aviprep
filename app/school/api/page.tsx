"use client"

import { useEffect, useState } from "react"
import { useSchool } from "../layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Key,
  Copy,
  RefreshCw,
  CheckCircle2,
  Eye,
  EyeOff,
  Webhook,
  Code,
  Loader2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"

interface ApiSettings {
  apiKey: string | null
  apiEnabled: boolean
  webhookUrl: string | null
  webhookSecret: string | null
}

export default function ApiIntegrationPage() {
  const { school, refreshData } = useSchool()
  const [settings, setSettings] = useState<ApiSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showApiKey, setShowApiKey] = useState(false)
  const [showWebhookSecret, setShowWebhookSecret] = useState(false)
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState("")

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/school/api-settings")
        if (res.ok) {
          const data = await res.json()
          setSettings(data)
          setWebhookUrl(data.webhookUrl || "")
        }
      } catch (error) {
        console.error("Failed to fetch API settings:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleToggleApi = async (enabled: boolean) => {
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/school/api-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiEnabled: enabled }),
      })

      if (res.ok) {
        const data = await res.json()
        setSettings(data)
        toast.success(enabled ? "API enabled" : "API disabled")
        refreshData()
      }
    } catch (error) {
      toast.error("Failed to update API settings")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegenerateKey = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/school/api-settings/regenerate", {
        method: "POST",
      })

      if (res.ok) {
        const data = await res.json()
        setSettings(data)
        setShowRegenerateDialog(false)
        setShowApiKey(true)
        toast.success("API key regenerated")
      }
    } catch (error) {
      toast.error("Failed to regenerate API key")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveWebhook = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/school/api-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl }),
      })

      if (res.ok) {
        const data = await res.json()
        setSettings(data)
        toast.success("Webhook settings saved")
      }
    } catch (error) {
      toast.error("Failed to save webhook settings")
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  if (isLoading || !school) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API Integration</h1>
        <p className="text-muted-foreground">Connect AviPrep with your existing flight school systems</p>
      </div>

      {school.subscriptionTier === "basic" && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <p className="text-sm">
              API access requires a Pro or Enterprise plan.{" "}
              <a href="/school/settings" className="underline font-medium">
                Upgrade your plan
              </a>{" "}
              to enable API integration.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* API Key Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">API Key</CardTitle>
                  <CardDescription>Authenticate your API requests</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="api-enabled" className="text-sm">
                  Enabled
                </Label>
                <Switch
                  id="api-enabled"
                  checked={settings?.apiEnabled || false}
                  onCheckedChange={handleToggleApi}
                  disabled={isSubmitting || school.subscriptionTier === "basic"}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings?.apiKey ? (
              <>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={settings.apiKey}
                      readOnly
                      className="pr-20 font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(settings.apiKey!, "API key")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => setShowRegenerateDialog(true)}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate Key
                </Button>
              </>
            ) : (
              <Button className="w-full" onClick={handleRegenerateKey} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
                Generate API Key
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Webhook Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-500/10">
                <Webhook className="h-5 w-5 text-sky-500" />
              </div>
              <div>
                <CardTitle className="text-base">Webhooks</CardTitle>
                <CardDescription>Receive real-time updates about student activity</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://your-system.com/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                disabled={school.subscriptionTier === "basic"}
              />
            </div>
            {settings?.webhookSecret && (
              <div className="space-y-2">
                <Label>Webhook Secret</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showWebhookSecret ? "text" : "password"}
                      value={settings.webhookSecret}
                      readOnly
                      className="pr-10 font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
                      onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                    >
                      {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(settings.webhookSecret!, "Webhook secret")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use this secret to verify webhook signatures
                </p>
              </div>
            )}
            <Button
              className="w-full"
              onClick={handleSaveWebhook}
              disabled={isSubmitting || school.subscriptionTier === "basic"}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Webhook Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* API Documentation */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Code className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-base">API Documentation</CardTitle>
              <CardDescription>Learn how to integrate with the AviPrep API</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="endpoints">
            <TabsList className="mb-4">
              <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
              <TabsTrigger value="webhooks">Webhook Events</TabsTrigger>
              <TabsTrigger value="examples">Examples</TabsTrigger>
            </TabsList>

            <TabsContent value="endpoints" className="space-y-4">
              <div className="rounded-lg border overflow-hidden">
                <div className="bg-muted px-4 py-2 border-b">
                  <code className="text-sm">Base URL: https://aviprep.com.au/api/v1</code>
                </div>
                <div className="divide-y">
                  {[
                    { method: "GET", path: "/students", desc: "List all students" },
                    { method: "POST", path: "/students", desc: "Add a new student" },
                    { method: "GET", path: "/students/:id", desc: "Get student details" },
                    { method: "GET", path: "/students/:id/progress", desc: "Get student progress" },
                    { method: "GET", path: "/students/:id/exams", desc: "Get student exam history" },
                    { method: "DELETE", path: "/students/:id", desc: "Remove student from school" },
                    { method: "GET", path: "/progress", desc: "Get all students progress summary" },
                    { method: "GET", path: "/analytics", desc: "Get school analytics" },
                  ].map((endpoint) => (
                    <div key={endpoint.path + endpoint.method} className="flex items-center gap-4 px-4 py-3">
                      <Badge
                        variant={endpoint.method === "GET" ? "secondary" : endpoint.method === "POST" ? "default" : "destructive"}
                        className="w-16 justify-center"
                      >
                        {endpoint.method}
                      </Badge>
                      <code className="text-sm flex-1">{endpoint.path}</code>
                      <span className="text-sm text-muted-foreground">{endpoint.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Include your API key in the <code className="bg-muted px-1 rounded">Authorization</code> header:{" "}
                <code className="bg-muted px-1 rounded">Bearer YOUR_API_KEY</code>
              </p>
            </TabsContent>

            <TabsContent value="webhooks" className="space-y-4">
              <div className="rounded-lg border overflow-hidden">
                <div className="divide-y">
                  {[
                    { event: "student.enrolled", desc: "Triggered when a student is added to your school" },
                    { event: "student.removed", desc: "Triggered when a student is removed from your school" },
                    { event: "exam.started", desc: "Triggered when a student starts an exam" },
                    { event: "exam.completed", desc: "Triggered when a student completes an exam" },
                    { event: "progress.milestone", desc: "Triggered when a student reaches a progress milestone" },
                  ].map((webhook) => (
                    <div key={webhook.event} className="flex items-center gap-4 px-4 py-3">
                      <Badge variant="outline" className="font-mono">
                        {webhook.event}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{webhook.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Verify webhook signatures using HMAC-SHA256 with your webhook secret.
              </p>
            </TabsContent>

            <TabsContent value="examples" className="space-y-4">
              <div className="rounded-lg border bg-zinc-950 p-4 overflow-x-auto">
                <pre className="text-sm text-zinc-100">
                  <code>{`// Fetch all students
const response = await fetch('https://aviprep.com.au/api/v1/students', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

const { students } = await response.json();
console.log(students);

// Add a new student
const newStudent = await fetch('https://aviprep.com.au/api/v1/students', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'student@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '0412345678',
    arn: '123456'
  })
});`}</code>
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Regenerate Dialog */}
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate API Key</DialogTitle>
            <DialogDescription>
              This will invalidate your current API key. Any integrations using the old key will stop working immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegenerateDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRegenerateKey} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Regenerate Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
