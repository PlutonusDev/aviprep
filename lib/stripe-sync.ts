import "server-only"

import { stripe } from "./stripe"
import { prisma } from "./prisma"
import type { Product } from "./products"

// Store synced product mappings in database
// This allows us to maintain the link between our product IDs and Stripe IDs

export interface StripeSyncResult {
  created: number
  updated: number
  skipped: number
  errors: string[]
  mappings: Record<string, { stripeProductId: string; stripePriceId: string }>
}

export async function syncProductsToStripe(products: Product[]): Promise<StripeSyncResult> {
  const result: StripeSyncResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    mappings: {},
  }

  // Get all existing products from Stripe with our metadata
  const existingStripeProducts = await stripe.products.list({ limit: 100, active: true })
  const stripeProductsByInternalId = new Map<string, { product: typeof existingStripeProducts.data[0]; prices: any[] }>()

  for (const stripeProduct of existingStripeProducts.data) {
    const internalId = stripeProduct.metadata?.internal_product_id
    if (internalId) {
      // Get prices for this product
      const prices = await stripe.prices.list({ product: stripeProduct.id, active: true, limit: 10 })
      stripeProductsByInternalId.set(internalId, { product: stripeProduct, prices: prices.data })
    }
  }

  for (const product of products) {
    // Skip coming soon products
    if (product.comingSoon) {
      result.skipped++
      continue
    }

    try {
      const existing = stripeProductsByInternalId.get(product.id)

      if (existing) {
        // Product exists - check if we need to update
        const stripeProduct = existing.product
        const activePrice = existing.prices.find((p) => p.active)

        // Update product name/description if changed
        if (stripeProduct.name !== product.name || stripeProduct.description !== product.description) {
          await stripe.products.update(stripeProduct.id, {
            name: product.name,
            description: product.description,
          })
          result.updated++
        }

        // Check if price needs updating
        let stripePriceId = activePrice?.id
        if (activePrice && activePrice.unit_amount !== product.priceInCents) {
          // Archive old price and create new one
          await stripe.prices.update(activePrice.id, { active: false })

          const newPrice = await stripe.prices.create({
            product: stripeProduct.id,
            unit_amount: product.priceInCents,
            currency: "aud",
            ...(product.type === "subscription" && product.interval
              ? {
                  recurring: {
                    interval: product.interval,
                    interval_count: product.intervalCount || 1,
                  },
                }
              : {}),
            metadata: {
              internal_product_id: product.id,
            },
          } as any)
          stripePriceId = newPrice.id
          result.updated++
        } else if (!activePrice) {
          // No active price - create one
          const newPrice = await stripe.prices.create({
            product: stripeProduct.id,
            unit_amount: product.priceInCents,
            currency: "aud",
            ...(product.type === "subscription" && product.interval
              ? {
                  recurring: {
                    interval: product.interval,
                    interval_count: product.intervalCount || 1,
                  },
                }
              : {}),
            metadata: {
              internal_product_id: product.id,
            },
          } as any)
          stripePriceId = newPrice.id
          result.created++
        } else {
          result.skipped++
        }

        result.mappings[product.id] = {
          stripeProductId: stripeProduct.id,
          stripePriceId: stripePriceId || "",
        }
      } else {
        // Create new product in Stripe
        const stripeProduct = await stripe.products.create({
          name: product.name,
          description: product.description,
          metadata: {
            internal_product_id: product.id,
            category: product.category,
            license_type: product.licenseType || "",
            tier: product.tier || "",
            subject_id: product.subjectId || "",
          },
        })

        // Create price
        const stripePrice = await stripe.prices.create({
          product: stripeProduct.id,
          unit_amount: product.priceInCents,
          currency: "aud",
          ...(product.type === "subscription" && product.interval
            ? {
                recurring: {
                  interval: product.interval,
                  interval_count: product.intervalCount || 1,
                },
              }
            : {}),
          metadata: {
            internal_product_id: product.id,
          },
        } as any)

        result.mappings[product.id] = {
          stripeProductId: stripeProduct.id,
          stripePriceId: stripePrice.id,
        }
        result.created++
      }

      // Save mapping to database
      await prisma.stripeProductMapping.upsert({
        where: { internalProductId: product.id },
        create: {
          internalProductId: product.id,
          stripeProductId: result.mappings[product.id].stripeProductId,
          stripePriceId: result.mappings[product.id].stripePriceId,
          productName: product.name,
          priceInCents: product.priceInCents,
        },
        update: {
          stripeProductId: result.mappings[product.id].stripeProductId,
          stripePriceId: result.mappings[product.id].stripePriceId,
          productName: product.name,
          priceInCents: product.priceInCents,
          updatedAt: new Date(),
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      result.errors.push(`Failed to sync ${product.id}: ${message}`)
    }
  }

  return result
}

// Get Stripe IDs for a product from database
export async function getStripeIds(internalProductId: string): Promise<{ stripeProductId: string; stripePriceId: string } | null> {
  const mapping = await prisma.stripeProductMapping.findUnique({
    where: { internalProductId },
  })

  if (!mapping) return null

  return {
    stripeProductId: mapping.stripeProductId,
    stripePriceId: mapping.stripePriceId,
  }
}

// Get all Stripe mappings from database
export async function getAllStripeMappings(): Promise<Record<string, { stripeProductId: string; stripePriceId: string }>> {
  const mappings = await prisma.stripeProductMapping.findMany()

  return Object.fromEntries(
    mappings.map((m) => [
      m.internalProductId,
      { stripeProductId: m.stripeProductId, stripePriceId: m.stripePriceId },
    ])
  )
}
