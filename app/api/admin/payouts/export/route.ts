import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@lib/prisma"
import { isResponse, requireStaff } from "@lib/staff"
import { isPeriod } from "@lib/finance/payouts"

export const dynamic = "force-dynamic"

const cell = (value: string | number) => {
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** A CSV of the month's statements and their Stripe payments, for the books. No bank details: those live in Stripe. */
export async function GET(request: NextRequest) {
  const staff = await requireStaff()
  if (isResponse(staff)) return staff

  const period = request.nextUrl.searchParams.get("period")
  if (!isPeriod(period)) return NextResponse.json({ error: "Choose a month." }, { status: 400 })

  const statements = await prisma.royaltyStatement.findMany({ where: { period, status: { in: ["draft", "sent", "paid"] } }, orderBy: { number: "asc" } })
  const curators = await prisma.curator.findMany({
    where: { id: { in: statements.map((s) => s.curatorId) } },
    select: { id: true, firstName: true, lastName: true, legalName: true, email: true, abn: true, stripeAccountId: true },
  })
  const byId = new Map(curators.map((c) => [c.id, c]))

  const rows = [
    ["Statement", "Status", "Invoice", "Name", "Email", "ABN", "Royalties", "GST", "Withheld", "Amount to pay", "Paid", "Stripe account", "Stripe transfer"],
    ...statements.map((s) => {
      const c = byId.get(s.curatorId)
      return [
        s.number,
        s.status,
        s.invoiceKind,
        c?.legalName || `${c?.firstName ?? ""} ${c?.lastName ?? ""}`.trim(),
        c?.email ?? "",
        c?.abn ?? "",
        (s.royaltyCents / 100).toFixed(2),
        (s.gstCents / 100).toFixed(2),
        (s.withholdingCents / 100).toFixed(2),
        (s.payableCents / 100).toFixed(2),
        s.paidAt ? s.paidAt.toISOString().slice(0, 10) : "",
        c?.stripeAccountId ?? "",
        s.stripeTransferId ?? "",
      ]
    }),
  ]

  return new NextResponse(`﻿${rows.map((r) => r.map(cell).join(",")).join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="AviPrep-payouts-${period}.csv"`,
      "Cache-Control": "no-store",
    },
  })
}
