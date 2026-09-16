"use client"

import { useEffect, useState, useCallback } from "react"
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
import { Plus, Edit, Loader2, Copy, Check, Ticket, CheckCircle2, Receipt } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, PageHeader, PageShell, StatTile } from "@/components/hub/page-primitives"
import { cn } from "@lib/utils"

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
    if (!coupon.isActive) return { label: "Off", dot: "bg-muted-foreground/50" }
    if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) return { label: "Expired", dot: "bg-destructive" }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return { label: "Used up", dot: "bg-warning" }
    return { label: "Active", dot: "bg-success" }
  }

  const activeCount = coupons.filter((c) => getCouponStatus(c).label === "Active").length
  const redemptions = coupons.reduce((n, c) => n + c.usedCount, 0)

  return (
    <PageShell>
      <PageHeader title="Coupons" description="Discount codes for checkout.">
        <Button onClick={handleNewCoupon} className="h-10 gap-2 self-start">
          <Plus className="h-4 w-4" aria-hidden="true" />
          New coupon
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile icon={Ticket} label="Coupons" value={loading ? "–" : String(coupons.length)} />
        <StatTile icon={CheckCircle2} label="Active" value={loading ? "–" : String(activeCount)} />
        <StatTile icon={Receipt} label="Redemptions" value={loading ? "–" : redemptions.toLocaleString()} />
      </div>

      {loading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : coupons.length === 0 ? (
        <EmptyState icon={Ticket} title="No coupons yet" description="Create one to offer a discount.">
          <Button onClick={handleNewCoupon} className="h-10 gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New coupon
          </Button>
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-e1">
          <div className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px]">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => {
                  const status = getCouponStatus(coupon)
                  return (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <code className="rounded-md bg-muted px-2 py-1 font-mono text-sm font-semibold text-foreground">{coupon.code}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleCopyCode(coupon.code)}
                            aria-label={copiedCode === coupon.code ? "Copied" : `Copy ${coupon.code}`}
                          >
                            {copiedCode === coupon.code ? (
                              <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground" data-tabular>
                        {coupon.discountPercent}% off
                      </TableCell>
                      <TableCell data-tabular>
                        {coupon.usedCount}
                        <span className="text-muted-foreground">{coupon.maxUses ? ` / ${coupon.maxUses}` : " / ∞"}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-tabular>
                        {coupon.validUntil
                          ? new Date(coupon.validUntil).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                          <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} aria-hidden="true" />
                          {status.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setIsNewCoupon(false)
                            setEditCoupon(coupon)
                          }}
                          aria-label={`Edit ${coupon.code}`}
                        >
                          <Edit className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

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
            <DialogTitle>{isNewCoupon ? "New coupon" : "Edit coupon"}</DialogTitle>
            <DialogDescription>
              {isNewCoupon ? "Customers enter this at checkout." : `Used ${editCoupon?.usedCount ?? 0} times.`}
            </DialogDescription>
          </DialogHeader>
          {editCoupon && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={editCoupon.code}
                    onChange={(e) => setEditCoupon({ ...editCoupon, code: e.target.value.toUpperCase() })}
                    className="font-mono"
                    placeholder="CPLSAVE20"
                  />
                  {isNewCoupon && (
                    <Button
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
                  <Label htmlFor="maxUses">Use limit</Label>
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
                <Label htmlFor="validUntil">Expires</Label>
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
                  <p className="text-sm text-muted-foreground">Turn off to stop it working.</p>
                </div>
                <Switch
                  checked={editCoupon.isActive}
                  onCheckedChange={(checked) => setEditCoupon({ ...editCoupon, isActive: checked })}
                />
              </div>

            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditCoupon(null)
                setIsNewCoupon(false)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveCoupon} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isNewCoupon ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
