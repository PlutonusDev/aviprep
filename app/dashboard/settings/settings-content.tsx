"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useUser } from "@lib/user-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { User, Bell, Shield, CreditCard, Trash2, Camera, Loader2 } from "lucide-react"
import { ImageCropper } from "@/components/hub/image-cropper"

export default function SettingsContent() {
  const { user, purchases, refresh } = useUser()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [cropperOpen, setCropperOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file")
      return
    }

    // Validate file size (max 5MB for original before crop)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be less than 5MB")
      return
    }

    setUploadError(null)

    // Create a URL for the image and open the cropper
    const imageUrl = URL.createObjectURL(file)
    setSelectedImage(imageUrl)
    setCropperOpen(true)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropperOpen(false)
    setIsUploading(true)
    setUploadError(null)

    try {
      // Create file from blob
      const file = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" })

      // Upload the cropped image
      const formData = new FormData()
      formData.append("file", file)

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadRes.ok) {
        throw new Error("Failed to upload image")
      }

      const { url } = await uploadRes.json()

      // Update user profile with new avatar URL
      const updateRes = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profilePicture: url }),
      })

      if (!updateRes.ok) {
        throw new Error("Failed to update profile")
      }

      // Refresh user data
      refresh()
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Failed to upload")
    } finally {
      setIsUploading(false)
      // Clean up the object URL
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage)
        setSelectedImage(null)
      }
    }
  }

  const handleCropperClose = () => {
    setCropperOpen(false)
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage)
      setSelectedImage(null)
    }
  }

  const initials = user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() : "?"

  // Calculate subscription info
  const hasBundle = user?.hasBundle && user?.bundleExpiry && new Date(user.bundleExpiry) > new Date()
  const activePurchases = purchases.filter((p) => new Date(p.expiresAt) > new Date())

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {selectedImage && (
        <ImageCropper
          open={cropperOpen}
          onClose={handleCropperClose}
          imageSrc={selectedImage}
          onCropComplete={handleCropComplete}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user?.profilePicture || undefined} alt={user?.firstName} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">{initials}</AvatarFallback>
              </Avatar>
              <button
                onClick={handleAvatarClick}
                disabled={isUploading}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </div>
            <div>
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent"
                onClick={handleAvatarClick}
                disabled={isUploading}
              >
                {isUploading ? "Uploading..." : "Change Photo"}
              </Button>
              {uploadError && <p className="text-sm text-destructive mt-1">{uploadError}</p>}
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG or GIF. Max 5MB.</p>
            </div>
          </div>

          <Separator />

          {/* Read-only user info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" value={user?.firstName || ""} className="bg-secondary/50 border-0" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" value={user?.lastName || ""} className="bg-secondary/50 border-0" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={user?.email || ""} className="bg-secondary/50 border-0" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={user?.phone || ""} className="bg-secondary/50 border-0" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arn">Aviation Reference Number (ARN)</Label>
              <Input id="arn" value={user?.arn || ""} className="bg-secondary/50 border-0" disabled />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">Contact support to update your personal information.</p>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Manage how you receive updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Email Notifications</p>
              <p className="text-sm text-muted-foreground">Receive study reminders and progress updates</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Weekly Progress Report</p>
              <p className="text-sm text-muted-foreground">Get a summary of your weekly performance</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Marketing Emails</p>
              <p className="text-sm text-muted-foreground">Receive news about new features and promotions</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription
          </CardTitle>
          <CardDescription>Manage your subscription and billing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasBundle ? (
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-3">
                <Badge variant="default" className="bg-primary">
                  Bundle
                </Badge>
                <div>
                  <p className="font-medium text-foreground">CPL Bundle</p>
                  <p className="text-sm text-muted-foreground">
                    All 7 subjects • Renews{" "}
                    {new Date(user!.bundleExpiry!).toLocaleDateString("en-AU", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <p className="font-bold text-foreground">$79/quarter</p>
            </div>
          ) : activePurchases.length > 0 ? (
            <div className="space-y-2">
              {activePurchases.map((purchase) => (
                <div key={purchase.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div>
                    <p className="font-medium text-foreground">{purchase.subjectName}</p>
                    <p className="text-sm text-muted-foreground">
                      Expires{" "}
                      {new Date(purchase.expiresAt).toLocaleDateString("en-AU", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <Badge variant="outline">{purchase.subjectCode}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <p>No active subscriptions</p>
              <Button className="mt-2" asChild>
                <a href="/dashboard/pricing">Get Access</a>
              </Button>
            </div>
          )}

          {(hasBundle || activePurchases.length > 0) && (
            <div className="flex gap-2">
              <Button variant="outline" className="bg-transparent">
                Update Payment Method
              </Button>
              {hasBundle && (
                <Button variant="outline" className="bg-transparent text-destructive hover:text-destructive">
                  Cancel Subscription
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>Protect your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Password</p>
              <p className="text-sm text-muted-foreground">Change your account password</p>
            </div>
            <Button variant="outline" className="bg-transparent">
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Delete Account</p>
              <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data</p>
            </div>
            <Button variant="destructive">Delete Account</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
