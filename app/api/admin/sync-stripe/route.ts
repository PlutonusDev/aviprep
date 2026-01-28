import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@lib/auth"
import { prisma } from "@lib/prisma"
import { syncProductsToStripe, getAllStripeMappings } from "@lib/stripe-sync"
import { ALL_PRODUCTS } from "@lib/products"

export async function POST() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const session = await verifyToken(token)
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    // Verify admin
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { isAdmin: true },
    })

    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Run the sync
    const result = await syncProductsToStripe(ALL_PRODUCTS)

    return NextResponse.json({
      success: true,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors,
      totalMappings: Object.keys(result.mappings).length,
    })
  } catch (error) {
    console.error("Stripe sync error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve current mappings
export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const session = await verifyToken(token)
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    // Verify admin
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { isAdmin: true },
    })

    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const mappings = await getAllStripeMappings()

    return NextResponse.json({ mappings })
  } catch (error) {
    console.error("Get mappings error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get mappings" },
      { status: 500 }
    )
  }
}
