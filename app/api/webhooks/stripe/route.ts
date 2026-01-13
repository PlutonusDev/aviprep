import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@lib/stripe"
import { prisma } from "@lib/prisma"
import { getProductById, SUBJECTS, CPL_BUNDLE } from "@lib/products"
import type Stripe from "stripe"

// Disable body parsing, we need raw body for webhook verification
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    // In production, use STRIPE_WEBHOOK_SECRET environment variable
    // For now, we'll construct the event without verification in development
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } else {
      // Development fallback - parse without verification
      event = JSON.parse(body) as Stripe.Event
    }
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      await handleSuccessfulPayment(session)
      break
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription
      await handleSubscriptionCancelled(subscription)
      break
    }
    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

async function handleSuccessfulPayment(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const productIdsStr = session.metadata?.productIds

  if (!userId || !productIdsStr) {
    console.error("Missing userId or productIds in session metadata")
    return
  }

  const productIds = productIdsStr.split(",")
  const now = new Date()
  const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
  const threeMonthsFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

  const stripeCustomerId = session.customer as string | null

  if (stripeCustomerId) {
    await prisma.user
      .update({
        where: { id: userId },
        data: { stripeCustomerId },
      })
      .catch(() => {
        // Ignore if already set (unique constraint)
      })
  }

  // Check if bundle was purchased
  const hasBundle = productIds.includes("cpl-bundle")

  // Check for add-ons
  const hasPrinting = productIds.includes("addon-printing")
  const hasAiInsights = productIds.includes("addon-ai-insights")

  if (hasBundle) {
    // Update user to have bundle access
    await prisma.user.update({
      where: { id: userId },
      data: {
        hasBundle: true,
        bundleExpiry: threeMonthsFromNow,
        ...(stripeCustomerId && { stripeCustomerId }),
      },
    })

    // Create purchases for all subjects with bundle
    for (const subject of SUBJECTS) {
      await prisma.purchase.upsert({
        where: {
          userId_subjectId: {
            userId,
            subjectId: subject.subjectId!,
          },
        },
        create: {
          userId,
          subjectId: subject.subjectId!,
          subjectName: subject.name,
          subjectCode: subject.id,
          purchaseType: "bundle",
          priceAud: CPL_BUNDLE.priceInCents,
          hasPrinting: true, // Bundle includes printing
          hasAiInsights: true, // Bundle includes AI insights
          expiresAt: threeMonthsFromNow,
          stripePaymentId: session.payment_intent as string,
          stripeCustomerId: session.customer as string,
        },
        update: {
          purchaseType: "bundle",
          hasPrinting: true,
          hasAiInsights: true,
          expiresAt: threeMonthsFromNow,
          stripePaymentId: session.payment_intent as string,
        },
      })
    }
  } else {
    // Individual subject purchases
    for (const productId of productIds) {
      const product = getProductById(productId)
      if (!product || !product.subjectId) continue

      await prisma.purchase.upsert({
        where: {
          userId_subjectId: {
            userId,
            subjectId: product.subjectId,
          },
        },
        create: {
          userId,
          subjectId: product.subjectId,
          subjectName: product.name,
          subjectCode: product.id,
          purchaseType: "individual",
          priceAud: product.priceInCents,
          hasPrinting,
          hasAiInsights,
          expiresAt: oneYearFromNow,
          stripePaymentId: session.payment_intent as string,
          stripeCustomerId: session.customer as string,
        },
        update: {
          hasPrinting,
          hasAiInsights,
          expiresAt: oneYearFromNow,
          stripePaymentId: session.payment_intent as string,
        },
      })
    }
  }

  console.log(`Successfully processed payment for user ${userId}`)
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
  })

  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        hasBundle: false,
        bundleExpiry: null,
      },
    })
    console.log(`Subscription cancelled for user ${user.id}`)
  }
}
