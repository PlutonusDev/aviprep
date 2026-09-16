import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { isResponse, requireStaff } from "@lib/staff"
import { PAYMENT_SELECT, paymentIssues } from "@lib/finance/payouts"
import { isValidAbn } from "@lib/finance/money"

const TAX_STATUSES = ["abn", "hobby", "no-abn"]

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) || null : null)
const digits = (value: unknown) => (typeof value === "string" ? value.replace(/\D/g, "") : "")
const day = (value: unknown) => (typeof value === "string" && value && !Number.isNaN(Date.parse(value)) ? new Date(value) : null)

export async function GET(_request: Request, { params }: { params: Promise<{ curatorId: string }> }) {
  const staff = await requireStaff()
  if (isResponse(staff)) return staff

  const { curatorId } = await params
  const curator = await prisma.curator.findUnique({ where: { id: curatorId }, select: PAYMENT_SELECT })
  if (!curator) return NextResponse.json({ error: "Curator not found." }, { status: 404 })
  return NextResponse.json({ payment: curator, issues: paymentIssues(curator) })
}

/** Tax details for statements and RCTIs. Bank details aren't here: curators keep them in Stripe. */
export async function PUT(request: Request, { params }: { params: Promise<{ curatorId: string }> }) {
  const staff = await requireStaff()
  if (isResponse(staff)) return staff

  const { curatorId } = await params
  const body = await request.json().catch(() => ({}))
  const fields: Record<string, string> = {}

  const taxStatus = typeof body.taxStatus === "string" && TAX_STATUSES.includes(body.taxStatus) ? body.taxStatus : null
  const abn = digits(body.abn)
  if (taxStatus === "abn" && !isValidAbn(abn)) fields.abn = "That ABN doesn't check out. It's 11 digits."
  if (abn && taxStatus !== "abn" && !isValidAbn(abn)) fields.abn = "That ABN doesn't check out."

  if (Object.keys(fields).length) return NextResponse.json({ error: "Check the highlighted fields.", fields }, { status: 400 })

  const gstRegistered = taxStatus === "abn" && body.gstRegistered === true

  try {
    const curator = await prisma.curator.update({
      where: { id: curatorId },
      data: {
        legalName: text(body.legalName, 120),
        tradingName: text(body.tradingName, 120),
        address: text(body.address, 200),
        taxStatus,
        abn: abn || null,
        gstRegistered,
        hobbyFormAt: taxStatus === "hobby" ? day(body.hobbyFormAt) : null,
        rctiAgreementAt: taxStatus === "abn" ? day(body.rctiAgreementAt) : null,
        paymentNotes: typeof body.paymentNotes === "string" ? body.paymentNotes.trim().slice(0, 1000) || null : null,
      },
      select: PAYMENT_SELECT,
    })
    return NextResponse.json({ payment: curator, issues: paymentIssues(curator) })
  } catch (error) {
    console.error("Payment details update failed:", error)
    return NextResponse.json({ error: "Couldn't save those details." }, { status: 500 })
  }
}
