import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"
import { stripe } from "@lib/stripe"

// GET - Fetch a single product from Stripe
export async function GET(
    request: Request,
    { params }: { params: Promise<{ productId: string }> }
) {
    try {
        const { productId } = await params
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

        const product = await stripe.products.retrieve(productId)
        const prices = await stripe.prices.list({ product: productId, limit: 100 })

        return NextResponse.json({
            product: {
                id: product.id,
                name: product.name,
                description: product.description,
                active: product.active,
                metadata: product.metadata,
                prices: prices.data.map((p) => ({
                    id: p.id,
                    unitAmount: p.unit_amount,
                    currency: p.currency,
                    recurring: p.recurring,
                    active: p.active,
                })),
            },
        })
    } catch (error) {
        console.error("Error fetching Stripe product:", error)
        return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 })
    }
}

// PATCH - Update a product in Stripe
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ productId: string }> }
) {
    try {
        const { productId } = await params
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
        const { name, description, active, metadata, newPrice } = body

        // Update the product
        const updateData: Parameters<typeof stripe.products.update>[1] = {}
        if (name !== undefined) updateData.name = name
        if (description !== undefined) updateData.description = description
        if (active !== undefined) updateData.active = active
        if (metadata !== undefined) updateData.metadata = metadata

        const product = await stripe.products.update(productId, updateData)

        // If a new price is provided, create it and set as default
        let newPriceObj = null
        if (newPrice) {
            const priceData: Parameters<typeof stripe.prices.create>[0] = {
                product: productId,
                unit_amount: newPrice.priceInCents,
                currency: newPrice.currency || "aud",
            }

            if (newPrice.recurring) {
                priceData.recurring = {
                    interval: newPrice.recurring.interval,
                    interval_count: newPrice.recurring.intervalCount || 1,
                }
            }

            newPriceObj = await stripe.prices.create(priceData)

            // Set as default price
            await stripe.products.update(productId, {
                default_price: newPriceObj.id,
            })

            // Optionally archive the old price
            if (newPrice.archiveOldPrice && product.default_price) {
                await stripe.prices.update(product.default_price as string, {
                    active: false,
                })
            }
        }

        return NextResponse.json({
            success: true,
            product: {
                id: product.id,
                name: product.name,
                description: product.description,
                active: product.active,
            },
            newPrice: newPriceObj ? {
                id: newPriceObj.id,
                unitAmount: newPriceObj.unit_amount,
            } : null,
        })
    } catch (error) {
        console.error("Error updating Stripe product:", error)
        return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
    }
}

// DELETE - Archive a product in Stripe (Stripe doesn't allow true deletion)
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ productId: string }> }
) {
    try {
        const { productId } = await params
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

        // Archive the product (set active to false)
        await stripe.products.update(productId, { active: false })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error archiving Stripe product:", error)
        return NextResponse.json({ error: "Failed to archive product" }, { status: 500 })
    }
}
