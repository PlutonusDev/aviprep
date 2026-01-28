"use client"

import { useEffect, useState } from "react"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, Loader2, ExternalLink, Plus, Trash2, RefreshCw, DollarSign, CloudUpload } from "lucide-react"
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Products</h2>
          <p className="text-muted-foreground">Manage products and pricing directly in Stripe</p>
        </div>
<div className="flex items-center gap-2">
  <Button variant="outline" onClick={handleSyncFromCode} disabled={syncing}>
  <CloudUpload className={`mr-2 h-4 w-4 ${syncing ? "animate-pulse" : ""}`} />
  {syncing ? "Syncing..." : "Sync from Code"}
  </Button>
  <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
  <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
  Refresh
  </Button>
          <Button variant="outline" asChild>
            <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Stripe Dashboard
            </a>
          </Button>
          <Button onClick={() => setShowNewProduct(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Product
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Products</CardTitle>
          <CardDescription>Products and prices are synced with Stripe. Changes here will update Stripe directly.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price (AUD)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stripe ID</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No products found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">{product.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            getProductType(product) === "bundle"
                              ? "default"
                              : getProductType(product) === "addon"
                              ? "outline"
                              : "secondary"
                          }
                        >
                          {getProductType(product)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono">
                          {formatPrice(product.priceInCents, product.currency)}
                          {product.recurring && (
                            <span className="text-muted-foreground text-xs ml-1">
                              /{product.recurring.intervalCount > 1 ? `${product.recurring.intervalCount} ` : ""}
                              {product.recurring.interval}
                              {product.recurring.intervalCount > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.active ? "default" : "secondary"}>
                          {product.active ? "Active" : "Archived"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{product.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {product.active && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleArchiveProduct(product.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Product Dialog */}
      <Dialog open={!!editProduct} onOpenChange={() => setEditProduct(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update product details. Price changes will create a new price in Stripe.</DialogDescription>
          </DialogHeader>
          {editProduct && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Product Name</Label>
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
                  <Label>Active</Label>
                  <p className="text-sm text-muted-foreground">Product is available for purchase</p>
                </div>
                <Switch checked={editActive} onCheckedChange={setEditActive} />
              </div>
              
              <div className="border-t pt-4 mt-2">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <Label>Current Price</Label>
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
                    Change Price
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Price ID: {editProduct.defaultPriceId}
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
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Price Dialog */}
      <Dialog open={showNewPrice} onOpenChange={setShowNewPrice}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Price</DialogTitle>
            <DialogDescription>
              Create a new price for this product. The old price will be archived.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="price-amount">New Price (AUD)</Label>
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
              <Label>Billing Type</Label>
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
                  <Label>Interval Count</Label>
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
                <p className="text-sm text-muted-foreground">Deactivate the previous price</p>
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
              Update Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Product Dialog */}
      <Dialog open={showNewProduct} onOpenChange={setShowNewProduct}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Product</DialogTitle>
            <DialogDescription>Add a new product to Stripe.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Product Name</Label>
              <Input
                id="new-name"
                placeholder="e.g., CPL Navigation"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-description">Description</Label>
              <Textarea
                id="new-description"
                placeholder="Product description..."
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
              <Label>Billing Type</Label>
              <Select value={newRecurring} onValueChange={setNewRecurring}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One-time payment</SelectItem>
                  <SelectItem value="recurring">Recurring subscription</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newRecurring === "recurring" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Billing Interval</Label>
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
                  <Label>Every X intervals</Label>
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
              Create Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
