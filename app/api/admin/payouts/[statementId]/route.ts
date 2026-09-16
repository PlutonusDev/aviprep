import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { isResponse, requireStaff } from "@lib/staff"
import { generateStatements } from "@lib/finance/payouts"
import { sendStatement } from "@lib/finance/send"
import { payStatement } from "@lib/finance/connect"

/**
 * { action: "send" }                         email it (or resend)
 * { action: "pay" }                          transfer it through Stripe
 * { action: "mark-paid", paidAt?, reference? } paid some other way
 * { action: "mark-unpaid" }
 * { action: "regenerate" }                   refresh a draft with the latest figures
 * { action: "void" }                         cancel it; a new statement can then be generated
 */
export async function POST(request: Request, { params }: { params: Promise<{ statementId: string }> }) {
  const staff = await requireStaff()
  if (isResponse(staff)) return staff

  const { statementId } = await params
  const statement = await prisma.royaltyStatement.findUnique({ where: { id: statementId } })
  if (!statement) return NextResponse.json({ error: "Statement not found." }, { status: 404 })
  const body = await request.json().catch(() => ({}))

  try {
    switch (body.action) {
      case "send": {
        const result = await sendStatement(statement.id)
        return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.error }, { status: 502 })
      }
      case "pay": {
        const result = await payStatement(statement.id)
        return result.ok ? NextResponse.json({ ok: true, transferId: result.transferId }) : NextResponse.json({ error: result.error }, { status: 400 })
      }
      case "mark-paid": {
        if (statement.status === "void") return NextResponse.json({ error: "A voided statement can't be paid." }, { status: 400 })
        const paidAt = typeof body.paidAt === "string" && !Number.isNaN(Date.parse(body.paidAt)) ? new Date(body.paidAt) : new Date()
        const reference = typeof body.reference === "string" ? body.reference.trim().slice(0, 120) || null : null
        await prisma.royaltyStatement.update({ where: { id: statement.id }, data: { status: "paid", paidAt, paymentReference: reference } })
        return NextResponse.json({ ok: true })
      }
      case "mark-unpaid": {
        if (statement.status !== "paid") return NextResponse.json({ error: "It isn't marked paid." }, { status: 400 })
        if (statement.stripeTransferId) {
          return NextResponse.json({ error: "It was paid through Stripe. Reverse the transfer in Stripe first." }, { status: 400 })
        }
        await prisma.royaltyStatement.update({
          where: { id: statement.id },
          data: { status: statement.sentAt ? "sent" : "draft", paidAt: null, paymentReference: null },
        })
        return NextResponse.json({ ok: true })
      }
      case "regenerate": {
        if (statement.status !== "draft") return NextResponse.json({ error: "Only a draft can be refreshed. Void it first." }, { status: 400 })
        await generateStatements(statement.period, staff, [statement.curatorId])
        return NextResponse.json({ ok: true })
      }
      case "void": {
        if (statement.status === "paid") return NextResponse.json({ error: "Mark it unpaid before voiding it." }, { status: 400 })
        await prisma.royaltyStatement.update({ where: { id: statement.id }, data: { status: "void", voidedAt: new Date() } })
        return NextResponse.json({ ok: true })
      }
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 })
    }
  } catch (error) {
    console.error("Statement action error:", error)
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 })
  }
}
