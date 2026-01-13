"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Loader2, Copy, Check } from "lucide-react"

interface Coupon {
  id: string
  code: string
  discountPercent: number
  maxUses: number | null
  usedCount: number
  validFrom: string
  validUntil: string | null
  isActive: boolean
  applicableProducts: string[]
  createdAt: string
}

export function CouponsContent() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null)
  const [isNewCoupon, setIsNewCoupon] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const fetchCoupons = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/coupons")
      if (res.ok) {
        const data = await res.json()
        setCoupons(data.coupons)
      }
    } catch (error) {
      console.error("Failed to fetch coupons:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCoupons()
  }, [fetchCoupons])

  const handleNewCoupon = () => {
    setIsNewCoupon(true)
    setEditCoupon({
      id: "",
      code: generateCouponCode(),
      discountPercent: 10,
      maxUses: null,
      usedCount: 0,
      validFrom: new Date().toISOString(),
      validUntil: null,
      isActive: true,
      applicableProducts: [],
      createdAt: new Date().toISOString(),
    })
  }

  const generateCouponCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let code = "AVIPREP_"
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const handleSaveCoupon = async () => {
    if (!editCoupon) return
    setSaving(true)
    try {
      const url = isNewCoupon ? "/api/admin/coupons" : `/api/admin/coupons/${editCoupon.id}`
      const method = isNewCoupon ? "POST" : "PATCH"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: editCoupon.code,
          discountPercent: editCoupon.discountPercent,
          maxUses: editCoupon.maxUses,
          validUntil: editCoupon.validUntil,
          isActive: editCoupon.isActive,
        }),
      })

      if (res.ok) {
        setEditCoupon(null)
        setIsNewCoupon(false)
        fetchCoupons()
      }
    } catch (error) {
      console.error("Failed to save coupon:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const getCouponStatus = (coupon: Coupon) => {
    if (!coupon.isActive) return { label: "Inactive", color: "bg-muted text-muted-foreground" }
    if (coupon.validUntil && new Date(coupon.validUntil) < new Date())
      return { label: "Expired", color: "bg-red-500/10 text-red-500" }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses)
      return { label: "Exhausted", color: "bg-yellow-500/10 text-yellow-500" }
    return { label: "Active", color: "bg-green-500/10 text-green-500" }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Coupons</h2>
          <p className="text-muted-foreground">Create and manage discount codes</p>
        </div>
        <Button className="cursor-pointer" onClick={handleNewCoupon}>
          <Plus className="mr-2 h-4 w-4" />
          Create Coupon
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Coupons</CardTitle>
          <CardDescription>Manage discount codes for your products</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : coupons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No coupons found. Create your first coupon to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  coupons.map((coupon) => {
                    const status = getCouponStatus(coupon)
                    return (
                      <TableRow key={coupon.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="rounded bg-muted px-2 py-1 font-mono text-sm">{coupon.code}</code>
                            <Button className="cursor-pointer h-6 w-6"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopyCode(coupon.code)}
                            >
                              {copiedCode === coupon.code ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-primary">{coupon.discountPercent}% off</TableCell>
                        <TableCell>
                          {coupon.usedCount}
                          {coupon.maxUses ? ` / ${coupon.maxUses}` : " (unlimited)"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {coupon.validUntil ? new Date(coupon.validUntil).toLocaleDateString() : "No expiry"}
                        </TableCell>
                        <TableCell>
                          <Badge className={status.color}>{status.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button className="cursor-pointer"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setIsNewCoupon(false)
                              setEditCoupon(coupon)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit/Create Coupon Dialog */}
      <Dialog
        open={!!editCoupon}
        onOpenChange={() => {
          setEditCoupon(null)
          setIsNewCoupon(false)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNewCoupon ? "Create Coupon" : "Edit Coupon"}</DialogTitle>
            <DialogDescription>
              {isNewCoupon ? "Create a new discount code" : "Update coupon settings"}
            </DialogDescription>
          </DialogHeader>
          {editCoupon && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Coupon Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={editCoupon.code}
                    onChange={(e) => setEditCoupon({ ...editCoupon, code: e.target.value.toUpperCase() })}
                    className="font-mono"
                    placeholder="e.g., CPLSAVE20"
                  />
                  {isNewCoupon && (
                    <Button className="cursor-pointer"
                      variant="outline"
                      onClick={() => setEditCoupon({ ...editCoupon, code: generateCouponCode() })}
                    >
                      Generate
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discount">Discount (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="1"
                    max="100"
                    value={editCoupon.discountPercent}
                    onChange={(e) =>
                      setEditCoupon({ ...editCoupon, discountPercent: Number.parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxUses">Max Uses (empty = unlimited)</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    min="1"
                    value={editCoupon.maxUses || ""}
                    onChange={(e) =>
                      setEditCoupon({
                        ...editCoupon,
                        maxUses: e.target.value ? Number.parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="Unlimited"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="validUntil">Expiry Date (optional)</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={editCoupon.validUntil ? editCoupon.validUntil.split("T")[0] : ""}
                  onChange={(e) =>
                    setEditCoupon({
                      ...editCoupon,
                      validUntil: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>Active</Label>
                  <p className="text-sm text-muted-foreground">Enable or disable this coupon</p>
                </div>
                <Switch
                  checked={editCoupon.isActive}
                  onCheckedChange={(checked) => setEditCoupon({ ...editCoupon, isActive: checked })}
                />
              </div>

              {!isNewCoupon && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Used: </span>
                    <span className="font-medium">{editCoupon.usedCount} times</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Created: </span>
                    <span className="font-medium">{new Date(editCoupon.createdAt).toLocaleDateString()}</span>
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button className="cursor-pointer"
              variant="outline"
              onClick={() => {
                setEditCoupon(null)
                setIsNewCoupon(false)
              }}
            >
              Cancel
            </Button>
            <Button className="cursor-pointer" onClick={handleSaveCoupon} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isNewCoupon ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
