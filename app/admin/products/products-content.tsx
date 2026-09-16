"use client"

import { useEffect, useState } from "react"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, Loader2, ExternalLink, Plus, RefreshCw, DollarSign, CloudUpload, ChevronDown, Package, CheckCircle2, Archive } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, PageHeader, PageShell, StatTile } from "@/components/hub/page-primitives"
import { cn } from "@lib/utils"
import { toast } from "sonner"

interface StripeProduct {
  id: string
  name: string
  description: string
  active: boolean
  metadata: Record<string, string>
  defaultPriceId: string | null
  priceInCents: number
  currency: string
  recurring: {
    interval: "day" | "week" | "month" | "year"
    intervalCount: number
  } | null
  prices: {
    id: string
    unitAmount: number
    currency: string
    recurring: {
      interval: string
      interval_count: number
    } | null
    active: boolean
  }[]
  createdAt: string
}

export function ProductsContent() {
  const [products, setProducts] = useState<StripeProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [editProduct, setEditProduct] = useState<StripeProduct | null>(null)
  const [saving, setSaving] = useState(false)
  const [showNewProduct, setShowNewProduct] = useState(false)
  const [showNewPrice, setShowNewPrice] = useState(false)

  // Edit form state
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editActive, setEditActive] = useState(true)

  // New product form state
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newPrice, setNewPrice] = useState("")
  const [newRecurring, setNewRecurring] = useState<string>("one_time")
  const [newInterval, setNewInterval] = useState<"month" | "year">("month")
  const [newIntervalCount, setNewIntervalCount] = useState("1")

  // New price form state
  const [priceAmount, setPriceAmount] = useState("")
  const [priceRecurring, setPriceRecurring] = useState<string>("one_time")
  const [priceInterval, setPriceInterval] = useState<"month" | "year">("month")
  const [priceIntervalCount, setPriceIntervalCount] = useState("1")
  const [archiveOldPrice, setArchiveOldPrice] = useState(true)

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/admin/stripe-products")
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
      } else {
        toast.error("Failed to fetch products")
      }
    } catch {
      toast.error("Failed to fetch products")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleSyncFromCode = async () => {
    setSyncing(true)
    try {
      const res = await fetch("/api/admin/sync-stripe", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        toast.success(
          `Sync complete: ${data.created} created, ${data.updated} updated, ${data.skipped} skipped`
        )
        if (data.errors?.length > 0) {
          toast.error(`${data.errors.length} errors occurred`)
          console.error("Sync errors:", data.errors)
        }
        await fetchProducts()
      } else {
        const error = await res.json()
        toast.error(error.error || "Sync failed")
      }
    } catch {
      toast.error("Failed to sync products")
    } finally {
      setSyncing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchProducts()
  }

  const handleEditProduct = (product: StripeProduct) => {
    setEditProduct(product)
    setEditName(product.name)
    setEditDescription(product.description)
    setEditActive(product.active)
  }

  const handleSaveProduct = async () => {
    if (!editProduct) return
    setSaving(true)

    try {
      const res = await fetch(`/api/admin/stripe-products/${editProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          active: editActive,
        }),
      })

      if (res.ok) {
        toast.success("Product updated successfully")
        setEditProduct(null)
        fetchProducts()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to update product")
      }
    } catch {
      toast.error("Failed to update product")
    } finally {
      setSaving(false)
    }
  }

  const handleCreateProduct = async () => {
    if (!newName || !newPrice) {
      toast.error("Name and price are required")
      return
    }

    setSaving(true)

    try {
      const priceInCents = Math.round(parseFloat(newPrice) * 100)
      const body: Record<string, unknown> = {
        name: newName,
        description: newDescription,
        priceInCents,
        currency: "aud",
      }

      if (newRecurring !== "one_time") {
        body.recurring = {
          interval: newInterval,
          intervalCount: parseInt(newIntervalCount),
        }
      }

      const res = await fetch("/api/admin/stripe-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toast.success("Product created successfully")
        setShowNewProduct(false)
        setNewName("")
        setNewDescription("")
        setNewPrice("")
        setNewRecurring("one_time")
        fetchProducts()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to create product")
      }
    } catch {
      toast.error("Failed to create product")
    } finally {
      setSaving(false)
    }
  }

  const handleAddNewPrice = async () => {
    if (!editProduct || !priceAmount) {
      toast.error("Price amount is required")
      return
    }

    setSaving(true)

    try {
      const priceInCents = Math.round(parseFloat(priceAmount) * 100)
      const body: Record<string, unknown> = {
        newPrice: {
          priceInCents,
          currency: "aud",
          archiveOldPrice,
        },
      }

      if (priceRecurring !== "one_time") {
        (body.newPrice as Record<string, unknown>).recurring = {
          interval: priceInterval,
          intervalCount: parseInt(priceIntervalCount),
        }
      }

      const res = await fetch(`/api/admin/stripe-products/${editProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toast.success("Price updated successfully")
        setShowNewPrice(false)
        setPriceAmount("")
        fetchProducts()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to update price")
      }
    } catch {
      toast.error("Failed to update price")
    } finally {
      setSaving(false)
    }
  }

  const handleArchiveProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to archive this product? It will no longer be available for purchase.")) {
      return
    }

    try {
      const res = await fetch(`/api/admin/stripe-products/${productId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        toast.success("Product archived successfully")
        fetchProducts()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to archive product")
      }
    } catch {
      toast.error("Failed to archive product")
    }
  }

  const formatPrice = (cents: number, currency: string = "aud") => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100)
  }

  const getProductType = (product: StripeProduct) => {
    if (product.metadata?.type) return product.metadata.type
    if (product.name.toLowerCase().includes("bundle")) return "bundle"
    if (product.name.toLowerCase().includes("add-on") || product.name.toLowerCase().includes("addon")) return "addon"
    return "subject"
  }

  const TYPE_LABELS: Record<string, string> = { bundle: "Bundle", addon: "Add-on", subject: "Subject" }
  const activeCount = products.filter((p) => p.active).length

  return (
    <PageShell>
      <PageHeader title="Products" description="Prices live in Stripe. Changes here update Stripe directly.">
        <div className="flex flex-wrap gap-2 self-start">
          <Button onClick={() => setShowNewProduct(true)} className="h-10 gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New product
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 gap-2">
                More
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} aria-hidden="true" />
                Refresh from Stripe
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSyncFromCode} disabled={syncing}>
                <CloudUpload className={cn("mr-2 h-4 w-4", syncing && "animate-pulse")} aria-hidden="true" />
                {syncing ? "Syncing" : "Push catalogue to Stripe"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                  Open Stripe
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile icon={Package} label="Products" value={loading ? "–" : String(products.length)} />
        <StatTile icon={CheckCircle2} label="On sale" value={loading ? "–" : String(activeCount)} />
        <StatTile icon={Archive} label="Archived" value={loading ? "–" : String(products.length - activeCount)} />
      </div>

      {loading ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : products.length === 0 ? (
        <EmptyState icon={Package} title="No products yet" description="Create one, or push the catalogue from code.">
          <Button onClick={() => setShowNewProduct(true)} className="h-10 gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New product
          </Button>
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-e1">
          <div className="overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} className={cn(!product.active && "opacity-70")}>
                    <TableCell className="max-w-[360px]">
                      <p className="font-medium text-foreground">{product.name}</p>
                      {product.description && <p className="line-clamp-1 text-sm text-muted-foreground">{product.description}</p>}
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{product.id}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{TYPE_LABELS[getProductType(product)] ?? getProductType(product)}</Badge>
                    </TableCell>
                    <TableCell className="text-right" data-tabular>
                      <span className="font-semibold text-foreground">{formatPrice(product.priceInCents, product.currency)}</span>
                      {product.recurring && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          /{product.recurring.intervalCount > 1 ? `${product.recurring.intervalCount} ` : ""}
                          {product.recurring.interval}
                          {product.recurring.intervalCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                        <span className={cn("h-1.5 w-1.5 rounded-full", product.active ? "bg-success" : "bg-muted-foreground/50")} aria-hidden="true" />
                        {product.active ? "On sale" : "Archived"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)} aria-label={`Edit ${product.name}`}>
                          <Edit className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        {product.active && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleArchiveProduct(product.id)}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label={`Archive ${product.name}`}
                          >
                            <Archive className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Edit Product Dialog */}
      <Dialog open={!!editProduct} onOpenChange={() => setEditProduct(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit product</DialogTitle>
            <DialogDescription>Changing the price creates a new one in Stripe.</DialogDescription>
          </DialogHeader>
          {editProduct && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>On sale</Label>
                  <p className="text-sm text-muted-foreground">Customers can buy it.</p>
                </div>
                <Switch checked={editActive} onCheckedChange={setEditActive} />
              </div>

              <div className="border-t pt-4 mt-2">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <Label>Price</Label>
                    <p className="text-lg font-semibold">
                      {formatPrice(editProduct.priceInCents, editProduct.currency)}
                      {editProduct.recurring && (
                        <span className="text-sm text-muted-foreground ml-1">
                          /{editProduct.recurring.interval}
                        </span>
                      )}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowNewPrice(true)}>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Change price
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {editProduct.defaultPriceId}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProduct(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProduct} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Price Dialog */}
      <Dialog open={showNewPrice} onOpenChange={setShowNewPrice}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change price</DialogTitle>
            <DialogDescription>
              Stripe prices can&apos;t be edited, so this creates a new one.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="price-amount">New price (AUD)</Label>
              <Input
                id="price-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="49.00"
                value={priceAmount}
                onChange={(e) => setPriceAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Billing</Label>
              <Select value={priceRecurring} onValueChange={setPriceRecurring}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One-time</SelectItem>
                  <SelectItem value="recurring">Recurring</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {priceRecurring === "recurring" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Interval</Label>
                  <Select value={priceInterval} onValueChange={(v) => setPriceInterval(v as "month" | "year")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Month</SelectItem>
                      <SelectItem value="year">Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Every</Label>
                  <Input
                    type="number"
                    min="1"
                    value={priceIntervalCount}
                    onChange={(e) => setPriceIntervalCount(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Archive old price</Label>
                <p className="text-sm text-muted-foreground">Stop selling at the current price.</p>
              </div>
              <Switch checked={archiveOldPrice} onCheckedChange={setArchiveOldPrice} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPrice(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNewPrice} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Product Dialog */}
      <Dialog open={showNewProduct} onOpenChange={setShowNewProduct}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New product</DialogTitle>
            <DialogDescription>Created straight in Stripe.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Name</Label>
              <Input
                id="new-name"
                placeholder="e.g. CPL Navigation"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-description">Description</Label>
              <Textarea
                id="new-description"
                placeholder="Optional"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-price">Price (AUD)</Label>
              <Input
                id="new-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="49.00"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Billing</Label>
              <Select value={newRecurring} onValueChange={setNewRecurring}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One-off</SelectItem>
                  <SelectItem value="recurring">Subscription</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newRecurring === "recurring" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Interval</Label>
                  <Select value={newInterval} onValueChange={(v) => setNewInterval(v as "month" | "year")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="year">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Every</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={newIntervalCount}
                    onChange={(e) => setNewIntervalCount(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewProduct(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProduct} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
