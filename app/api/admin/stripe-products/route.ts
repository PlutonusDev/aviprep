import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"
import { stripe } from "@lib/stripe"

// GET - Fetch all products and prices from Stripe
export async function GET() {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get("session")?.value

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const payload = await verifyToken(token)
        if (!payload) return null

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { isAdmin: true },
        })

        if (!user?.isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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
                active: product.active,
                metadata: product.metadata,
                defaultPriceId: defaultPrice?.id || null,
                priceInCents: defaultPrice?.unit_amount || 0,
                currency: defaultPrice?.currency || "aud",
                recurring: defaultPrice?.recurring ? {
                    interval: defaultPrice.recurring.interval,
                    intervalCount: defaultPrice.recurring.interval_count,
                } : null,
                prices: productPrices.map((p) => ({
                    id: p.id,
                    unitAmount: p.unit_amount,
                    currency: p.currency,
                    recurring: p.recurring,
                    active: p.active,
                })),
                createdAt: new Date(product.created * 1000).toISOString(),
            }
        })

        return NextResponse.json({ products: productsWithPrices })
    } catch (error) {
        console.error("Error fetching Stripe products:", error)
        return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
    }
}

// POST - Create a new product in Stripe
export async function POST(request: Request) {
    try {
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get("session")?.value

        if (!sessionToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const session = await verifyToken(sessionToken)
        if (!session) {
            return NextResponse.json({ error: "Invalid session" }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { isAdmin: true },
        })

        if (!user?.isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await request.json()
        const { name, description, priceInCents, currency = "aud", recurring, metadata } = body

        if (!name || priceInCents === undefined) {
            return NextResponse.json({ error: "Name and price are required" }, { status: 400 })
        }

        // Create the product in Stripe
        const product = await stripe.products.create({
            name,
            description: description || undefined,
            metadata: metadata || {},
        })

        // Create the price in Stripe
        const priceData: Parameters<typeof stripe.prices.create>[0] = {
            product: product.id,
            unit_amount: priceInCents,
            currency,
        }

        if (recurring) {
            priceData.recurring = {
                interval: recurring.interval,
                interval_count: recurring.intervalCount || 1,
            }
        }

        const price = await stripe.prices.create(priceData)

        // Update the product with the default price
        await stripe.products.update(product.id, {
            default_price: price.id,
        })

        return NextResponse.json({
            success: true,
            product: {
                id: product.id,
                name: product.name,
                description: product.description,
                priceId: price.id,
                priceInCents: price.unit_amount,
            },
        })
    } catch (error) {
        console.error("Error creating Stripe product:", error)
        return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
    }
}
