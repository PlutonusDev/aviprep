import { NextResponse } from "next/server"
import { stripe } from "@lib/stripe"

// Cache products for 5 minutes to reduce Stripe API calls
let cachedProducts: unknown = null
let cacheTimestamp = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// GET - Fetch all active products and prices from Stripe (public endpoint)
export async function GET() {
  try {
    const now = Date.now()
    
    // Return cached data if still valid
    if (cachedProducts && now - cacheTimestamp < CACHE_DURATION) {
      return NextResponse.json(cachedProducts)
    }

    // Fetch products from Stripe
    const products = await stripe.products.list({ limit: 100, active: true })
    
    // Fetch prices from Stripe
    const prices = await stripe.prices.list({ limit: 100, active: true })

    // Map prices to products
    const productsWithPrices = products.data.map((product) => {
      const productPrices = prices.data.filter((p) => p.product === product.id)
      const defaultPrice = productPrices.find((p) => p.id === product.default_price) || productPrices[0]
      
      return {
        id: product.id,
        name: product.name,
        description: product.description || "",
        metadata: product.metadata,
        defaultPriceId: defaultPrice?.id || null,
        priceInCents: defaultPrice?.unit_amount || 0,
        currency: defaultPrice?.currency || "aud",
        recurring: defaultPrice?.recurring ? {
          interval: defaultPrice.recurring.interval,
          intervalCount: defaultPrice.recurring.interval_count,
        } : null,
      }
    })

    // Organize products by type based on metadata or name patterns
    const bundles = productsWithPrices.filter(
      (p) => p.metadata?.type === "bundle" || p.name.toLowerCase().includes("bundle")
    )
    const subjects = productsWithPrices.filter(
      (p) => p.metadata?.type === "subject" || 
      (!p.name.toLowerCase().includes("bundle") && 
       !p.name.toLowerCase().includes("add-on") &&
       !p.name.toLowerCase().includes("addon"))
    )
    const addons = productsWithPrices.filter(
      (p) => p.metadata?.type === "addon" || 
      p.name.toLowerCase().includes("add-on") || 
      p.name.toLowerCase().includes("addon")
    )

    const response = {
      products: productsWithPrices,
      bundles,
      subjects,
      addons,
    }

    // Update cache
    cachedProducts = response
    cacheTimestamp = now

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}
