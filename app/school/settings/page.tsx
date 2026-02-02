"use client"

import React, { useEffect, useState } from "react"
import { useSchool } from "../layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Building2, 
  Upload, 
  Loader2, 
  CheckCircle2, 
  Palette, 
  Globe, 
  Eye,
  Copy,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"

interface SchoolSettings {
  name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  postcode: string
  website: string
  logo: string | null
  subscriptionTier: string
  subscriptionExpiry: string | null
  maxStudents: number
  // Branding fields
  subdomain: string | null
  customDomain: string | null
  primaryColour: string
  accentColour: string
  favicon: string | null
  loginBackground: string | null
  welcomeMessage: string | null
  footerText: string | null
  hideBranding: boolean
}

export default function SettingsPage() {
  const { school, refreshData } = useSchool()
  const [settings, setSettings] = useState<SchoolSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false)
  const [isUploadingBackground, setIsUploadingBackground] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/school/settings")
        if (res.ok) {
          const data = await res.json()
          setSettings(data)
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "logo" | "favicon" | "loginBackground",
    setUploading: (v: boolean) => void
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (uploadRes.ok) {
        const { url } = await uploadRes.json()
        setSettings((s) => (s ? { ...s, [field]: url } : null))
        toast.success("File uploaded")
      }
    } catch {
      toast.error("Failed to upload file")
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return
    setIsSaving(true)

    try {
      const res = await fetch("/api/school/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: settings.name,
          phone: settings.phone,
          address: settings.address,
          city: settings.city,
          state: settings.state,
          postcode: settings.postcode,
          website: settings.website,
          logo: settings.logo,
          // Branding fields
          subdomain: settings.subdomain,
          primaryColour: settings.primaryColour,
          accentColour: settings.accentColour,
          favicon: settings.favicon,
          loginBackground: settings.loginBackground,
          welcomeMessage: settings.welcomeMessage,
          footerText: settings.footerText,
          hideBranding: settings.hideBranding,
        }),
      })

      if (res.ok) {
        toast.success("Settings saved")
        refreshData()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to save settings")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setIsSaving(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const subdomainUrl = settings.subdomain 
    ? `https://${settings.subdomain}.aviprep.com.au` 
    : null

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your flight school profile, branding, and subscription</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <Building2 className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="domain" className="gap-2">
            <Globe className="h-4 w-4" />
            Domain
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Subscription
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">School Profile</CardTitle>
              <CardDescription>Update your flight school information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={settings.logo || undefined} />
                  <AvatarFallback className="bg-primary/10">
                    <Building2 className="h-8 w-8 text-primary" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Label htmlFor="logo-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                      {isUploadingLogo ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Upload Logo
                    </div>
                  </Label>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, "logo", setIsUploadingLogo)}
                    disabled={isUploadingLogo}
                  />
                  <p className="text-xs text-muted-foreground mt-1">PNG or JPG, max 2MB. Used in sidebar and emails.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">School Name</Label>
                  <Input
                    id="name"
                    value={settings.name}
                    onChange={(e) => setSettings((s) => (s ? { ...s, name: e.target.value } : null))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={settings.email} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Contact support to change email</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={settings.phone || ""}
                    onChange={(e) => setSettings((s) => (s ? { ...s, phone: e.target.value } : null))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={settings.website || ""}
                    onChange={(e) => setSettings((s) => (s ? { ...s, website: e.target.value } : null))}
                    placeholder="https://"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={settings.address || ""}
                  onChange={(e) => setSettings((s) => (s ? { ...s, address: e.target.value } : null))}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={settings.city || ""}
                    onChange={(e) => setSettings((s) => (s ? { ...s, city: e.target.value } : null))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={settings.state || ""}
                    onChange={(e) => setSettings((s) => (s ? { ...s, state: e.target.value } : null))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postcode">Postcode</Label>
                  <Input
                    id="postcode"
                    value={settings.postcode || ""}
                    onChange={(e) => setSettings((s) => (s ? { ...s, postcode: e.target.value } : null))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Brand Colors</CardTitle>
              <CardDescription>Customize the look and feel of your training portal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primaryColour">Primary Color</Label>
                  <div className="flex gap-2">
                    <div 
                      className="w-12 h-10 rounded-md border cursor-pointer"
                      style={{ backgroundColor: settings.primaryColour }}
                      onClick={() => document.getElementById("primaryColourPicker")?.click()}
                    />
                    <Input
                      id="primaryColour"
                      value={settings.primaryColour}
                      onChange={(e) => setSettings((s) => (s ? { ...s, primaryColour: e.target.value } : null))}
                      placeholder="#0ea5e9"
                    />
                    <input
                      id="primaryColourPicker"
                      type="color"
                      value={settings.primaryColour}
                      onChange={(e) => setSettings((s) => (s ? { ...s, primaryColour: e.target.value } : null))}
                      className="sr-only"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Used for buttons, links, and highlights</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accentColour">Accent Color</Label>
                  <div className="flex gap-2">
                    <div 
                      className="w-12 h-10 rounded-md border cursor-pointer"
                      style={{ backgroundColor: settings.accentColour }}
                      onClick={() => document.getElementById("accentColourPicker")?.click()}
                    />
                    <Input
                      id="accentColour"
                      value={settings.accentColour}
                      onChange={(e) => setSettings((s) => (s ? { ...s, accentColour: e.target.value } : null))}
                      placeholder="#f97316"
                    />
                    <input
                      id="accentColourPicker"
                      type="color"
                      value={settings.accentColour}
                      onChange={(e) => setSettings((s) => (s ? { ...s, accentColour: e.target.value } : null))}
                      className="sr-only"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Used for secondary actions and accents</p>
                </div>
              </div>

              {/* Color Preview */}
              <div className="p-4 rounded-lg border bg-muted/30">
                <p className="text-sm font-medium mb-3">Preview</p>
                <div className="flex items-center gap-3">
                  <Button style={{ backgroundColor: settings.primaryColour }}>
                    Primary Button
                  </Button>
                  <Button variant="outline" style={{ borderColor: settings.primaryColour, color: settings.primaryColour }}>
                    Outline Button
                  </Button>
                  <Badge style={{ backgroundColor: settings.accentColour }}>
                    Badge
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Custom Assets</CardTitle>
              <CardDescription>Upload custom favicon and login background</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <Label>Favicon</Label>
                  <div className="flex items-center gap-4">
                    {settings.favicon ? (
                      <img src={settings.favicon || "/placeholder.svg"} alt="Favicon" className="h-8 w-8" />
                    ) : (
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <Label htmlFor="favicon-upload" className="cursor-pointer">
                      <div className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                        {isUploadingFavicon ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        Upload Favicon
                      </div>
                    </Label>
                    <input
                      id="favicon-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, "favicon", setIsUploadingFavicon)}
                      disabled={isUploadingFavicon}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">32x32 PNG recommended</p>
                </div>

                <div className="space-y-3">
                  <Label>Login Background</Label>
                  <div className="flex items-center gap-4">
                    {settings.loginBackground ? (
                      <img src={settings.loginBackground || "/placeholder.svg"} alt="Background" className="h-8 w-12 object-cover rounded" />
                    ) : (
                      <div className="h-8 w-12 rounded bg-muted flex items-center justify-center">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <Label htmlFor="bg-upload" className="cursor-pointer">
                      <div className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                        {isUploadingBackground ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        Upload Background
                      </div>
                    </Label>
                    <input
                      id="bg-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, "loginBackground", setIsUploadingBackground)}
                      disabled={isUploadingBackground}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">1920x1080 recommended</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Custom Text</CardTitle>
              <CardDescription>Personalize messages shown to your students</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="welcomeMessage">Welcome Message</Label>
                <Textarea
                  id="welcomeMessage"
                  value={settings.welcomeMessage || ""}
                  onChange={(e) => setSettings((s) => (s ? { ...s, welcomeMessage: e.target.value } : null))}
                  placeholder="Welcome to our training portal..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Shown on the login page</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="footerText">Footer Text</Label>
                <Input
                  id="footerText"
                  value={settings.footerText || ""}
                  onChange={(e) => setSettings((s) => (s ? { ...s, footerText: e.target.value } : null))}
                  placeholder="© 2024 Your Flight School"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="space-y-0.5">
                  <Label>Hide AviPrep Branding</Label>
                  <p className="text-xs text-muted-foreground">Remove "Powered by AviPrep" from your portal</p>
                </div>
                <Switch
                  checked={settings.hideBranding}
                  onCheckedChange={(checked) => setSettings((s) => (s ? { ...s, hideBranding: checked } : null))}
                  disabled={settings.subscriptionTier === "basic"}
                />
              </div>
              {settings.subscriptionTier === "basic" && (
                <p className="text-xs text-amber-600">Upgrade to Pro or Enterprise to hide AviPrep branding</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Domain Tab */}
        <TabsContent value="domain" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Subdomain</CardTitle>
              <CardDescription>Your students can access the portal via a custom subdomain</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subdomain">Subdomain</Label>
                <div className="flex">
                  <Input
                    id="subdomain"
                    value={settings.subdomain || ""}
                    onChange={(e) => setSettings((s) => (s ? { ...s, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") } : null))}
                    placeholder="yourschool"
                    className="rounded-r-none"
                  />
                  <div className="flex items-center px-3 border border-l-0 rounded-r-md bg-muted text-sm text-muted-foreground">
                    .aviprep.com.au
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Only lowercase letters, numbers, and hyphens allowed</p>
              </div>

              {subdomainUrl && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm flex-1">{subdomainUrl}</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(subdomainUrl)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={subdomainUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Custom Domain</CardTitle>
              <CardDescription>Use your own domain for the training portal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customDomain">Custom Domain</Label>
                <Input
                  id="customDomain"
                  value={settings.customDomain || ""}
                  disabled
                  placeholder="training.yourschool.com.au"
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Contact support to set up a custom domain. Requires Enterprise plan.
                </p>
              </div>

              {settings.subscriptionTier !== "enterprise" && (
                <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Custom domains are available on the Enterprise plan. Upgrade to use your own domain.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Plan</CardTitle>
              <CardDescription>Your subscription details and limits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="default" className="capitalize text-base px-4 py-1">
                    {settings.subscriptionTier}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">{settings.maxStudents} student seats</p>
                    {settings.subscriptionExpiry && (
                      <p className="text-xs text-muted-foreground">
                        Expires: {new Date(settings.subscriptionExpiry).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <Button>Upgrade Plan</Button>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t">
                {[
                  { 
                    tier: "Basic", 
                    students: 50, 
                    price: "$99/mo", 
                    features: ["Student tracking", "Progress reports", "Email support"] 
                  },
                  { 
                    tier: "Pro", 
                    students: 200, 
                    price: "$249/mo", 
                    features: ["API access", "Webhooks", "Custom branding", "Hide AviPrep branding", "Priority support"] 
                  },
                  { 
                    tier: "Enterprise", 
                    students: "Unlimited", 
                    price: "Custom", 
                    features: ["Custom domain", "Custom integrations", "Dedicated support", "SLA guarantee"] 
                  },
                ].map((plan) => (
                  <div
                    key={plan.tier}
                    className={`p-4 rounded-lg border ${
                      settings.subscriptionTier === plan.tier.toLowerCase() 
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{plan.tier}</p>
                      {settings.subscriptionTier === plan.tier.toLowerCase() && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-2xl font-bold mt-1">{plan.price}</p>
                    <p className="text-sm text-muted-foreground">{plan.students} students</p>
                    <ul className="mt-3 space-y-1.5">
                      {plan.features.map((f) => (
                        <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save All Changes
        </Button>
      </div>
    </div>
  )
}
