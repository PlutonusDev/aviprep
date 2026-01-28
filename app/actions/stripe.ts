"use server"

import { stripe } from "@lib/stripe"
import { getProductById } from "@lib/products"
import { cookies } from "next/headers"
import { verifyToken } from "@lib/auth"
import { prisma } from "@lib/prisma"

export async function createCheckoutSession(productIds: string[], returnUrl: string) {
  const cookieStore = await cookies()
  const token = cookieStore.get("session")?.value
  let userId: string | null = null
  let stripeCustomerId: string | null = null

  if (token) {
    const payload = await verifyToken(token)
    userId = payload?.userId || null

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true },
      })
      stripeCustomerId = user?.stripeCustomerId || null
    }
  }

  // Get synced Stripe mappings from database
  const stripeMappings = await prisma.stripeProductMapping.findMany({
    where: {
      internalProductId: { in: productIds },
    },
  })
  const mappingsByProductId = new Map(
    stripeMappings.map((m) => [m.internalProductId, m.stripePriceId])
  )

  const products = productIds.map((id) => {
    const product = getProductById(id)
    if (!product) {
      throw new Error(`Product with id "${id}" not found`)
    }
    // Use synced Stripe price ID if available, fallback to static
    const stripePriceId = mappingsByProductId.get(id) || product.stripePriceId
    if (!stripePriceId) {
      throw new Error(`No Stripe price ID found for product "${id}". Run Sync from Code in admin.`)
    }
    return { ...product, stripePriceId }
  })

  if (products.length === 0) {
    throw new Error("No products selected")
  }

  const hasSubscription = products.some((p) => p.type === "subscription")
  const mode = hasSubscription ? "subscription" : "payment"

  const lineItems = products.map((product) => ({
    price: product.stripePriceId,
    quantity: 1,
  }))

  const sessionConfig: any = {
    ui_mode: "embedded",
    redirect_on_completion: "if_required",
    return_url: returnUrl,
    line_items: lineItems,
    mode: mode,
    metadata: {
      userId: userId || "",
      productIds: productIds.join(","),
    },
    payment_method_options: {
      card: {
        request_three_d_secure: "automatic",
      },
    },
  }

  if (stripeCustomerId) {
    sessionConfig.customer = stripeCustomerId
  }

  const session = await stripe.checkout.sessions.create(sessionConfig)

  return session.client_secret
}

export async function getCheckoutSessionStatus(sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  return {
    status: session.status,
    paymentStatus: session.payment_status,
    customerEmail: session.customer_details?.email,
  }
}
