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
import { Edit, Loader2, ExternalLink } from "lucide-react"
import { SUBJECTS as PRODUCTS } from "@lib/products"

interface Product {
  id: string
  name: string
  description: string
  priceAud: number
  type: "one-time" | "subscription"
  stripePriceId: string
  stripeProductId: string
}

export function ProductsContent() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Load products from static config (prices are managed in Stripe)
    const allProducts = Object.entries(PRODUCTS).map(([id, product]) => ({
      id,
      name: product.name,
      description: product.description || "",
      priceAud: product.priceInCents,
      type: product.type,
      stripePriceId: product.stripePriceId,
      stripeProductId: product.stripeProductId,
    }))
    setProducts(allProducts)
    setLoading(false)
  }, [])

  const handleSaveProduct = async () => {
    if (!editProduct) return
    setSaving(true)
    // In a real implementation, this would update Stripe and local config
    // For now, we'll just close the dialog
    setTimeout(() => {
      setEditProduct(null)
      setSaving(false)
    }, 500)
  }

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Products</h2>
          <p className="text-muted-foreground">View and manage product pricing (synced with Stripe)</p>
        </div>
        <Button variant="outline" asChild>
          <a href="https://practice.stripe.com/products" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Stripe Dashboard
          </a>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Products</CardTitle>
          <CardDescription>Products are managed through Stripe. View pricing and details here.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price (AUD)</TableHead>
                  <TableHead>Stripe Price ID</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
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
                            product.type === "subscription" ? "default" : product.type === "one-time" ? "secondary" : "outline"
                          }
                        >
                          {product.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatPrice(product.priceAud)}
                        {product.type === "subscription" && <span className="text-muted-foreground">/quarter</span>}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{product.stripePriceId}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setEditProduct(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>View product information. Pricing changes should be made in Stripe.</DialogDescription>
          </DialogHeader>
          {editProduct && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Product Name</Label>
                <Input value={editProduct.name} disabled />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={editProduct.description} disabled />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price (AUD)</Label>
                  <Input value={formatPrice(editProduct.priceAud)} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Input value={editProduct.type} disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Stripe Product ID</Label>
                <Input value={editProduct.stripeProductId} disabled className="font-mono text-sm" />
              </div>
              <div className="space-y-2">
                <Label>Stripe Price ID</Label>
                <Input value={editProduct.stripePriceId} disabled className="font-mono text-sm" />
              </div>
              <p className="text-sm text-muted-foreground">
                To update pricing, please make changes directly in the{" "}
                <a
                  href="https://practice.stripe.com/products"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Stripe Dashboard
                </a>
                .
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProduct(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
