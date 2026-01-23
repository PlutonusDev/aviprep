"use client"

import React from "react"

import { useEffect, useState } from "react"
import { useSchool } from "../layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Building2, Upload, Loader2, CheckCircle2 } from "lucide-react"
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
}

export default function SettingsPage() {
  const { school, refreshData } = useSchool()
  const [settings, setSettings] = useState<SchoolSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingLogo(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (uploadRes.ok) {
        const { url } = await uploadRes.json()
        setSettings((s) => (s ? { ...s, logo: url } : null))
        toast.success("Logo uploaded")
      }
    } catch (error) {
      toast.error("Failed to upload logo")
    } finally {
      setIsUploadingLogo(false)
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
        }),
      })

      if (res.ok) {
        toast.success("Settings saved")
        refreshData()
      } else {
        toast.error("Failed to save settings")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your flight school profile and subscription</p>
      </div>

      {/* Subscription Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscription</CardTitle>
          <CardDescription>Your current plan and limits</CardDescription>
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

          <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t">
            {[
              { tier: "Basic", students: 50, price: "$99/mo", features: ["Student tracking", "Progress reports"] },
              { tier: "Pro", students: 200, price: "$249/mo", features: ["API access", "Webhooks", "Priority support"] },
              { tier: "Enterprise", students: "Unlimited", price: "Custom", features: ["Custom integrations", "Dedicated support"] },
            ].map((plan) => (
              <div
                key={plan.tier}
                className={`p-4 rounded-lg border ${settings.subscriptionTier === plan.tier.toLowerCase() ? "border-primary bg-primary/5" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{plan.tier}</p>
                  {settings.subscriptionTier === plan.tier.toLowerCase() && (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  )}
                </div>
                <p className="text-2xl font-bold mt-1">{plan.price}</p>
                <p className="text-sm text-muted-foreground">{plan.students} students</p>
                <ul className="mt-2 space-y-1">
                  {plan.features.map((f) => (
                    <li key={f} className="text-xs text-muted-foreground">
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Profile Card */}
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
                onChange={handleLogoUpload}
                disabled={isUploadingLogo}
              />
              <p className="text-xs text-muted-foreground mt-1">PNG or JPG, max 2MB</p>
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

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
