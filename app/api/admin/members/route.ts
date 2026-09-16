import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { verifyAdmin } from "app/api/admin/middleware"

export async function GET(request: NextRequest) {
  const adminCheck = await verifyAdmin()
  if ("error" in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
  }

  const searchParams = request.nextUrl.searchParams
  const page = Number.parseInt(searchParams.get("page") || "1")
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "10")
  const search = searchParams.get("search") || ""

  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" as const } },
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { arn: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {}

  const [members, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        arn: true,
        isAdmin: true,
        hasBundle: true,
        bundleExpiry: true,
        createdAt: true,
        purchases: {
          select: { subjectId: true, expiresAt: true },
        },
        _count: {
          select: { examAttempts: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({
    members,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}
