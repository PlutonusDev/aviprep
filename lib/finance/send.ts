import "server-only"

import { prisma } from "@lib/prisma"
import { sendEmailPartnership } from "@lib/email"
import { royaltyStatementEmail } from "@lib/email-royalty-statement"
import { renderInvoice, renderStatement } from "./documents"
import { financialYearToDate, type StatementSnapshot } from "./payouts"

export interface SendResult {
  ok: boolean
  error?: string
}

/** The PDFs for a stored statement, exactly as they'd be sent. */
export async function statementDocuments(statement: { curatorId: string; period: string; snapshot: unknown; status: string }) {
  const snapshot = statement.snapshot as StatementSnapshot
  const ytd = await financialYearToDate(statement.curatorId, statement.period)
  const draft = statement.status === "draft"
  const [pdf, invoice] = await Promise.all([renderStatement(snapshot, { draft, ytd }), renderInvoice(snapshot, { draft })])
  return { snapshot, statementPdf: pdf, invoicePdf: invoice }
}

/** Emails a draft statement (and its RCTI) to the curator, then marks it sent. */
export async function sendStatement(statementId: string): Promise<SendResult> {
  const statement = await prisma.royaltyStatement.findUnique({ where: { id: statementId } })
  if (!statement) return { ok: false, error: "Statement not found." }
  if (statement.status === "void") return { ok: false, error: "This statement was voided. Generate a new one." }

  const curator = await prisma.curator.findUnique({
    where: { id: statement.curatorId },
    select: { email: true, firstName: true, stripeBankName: true, stripeBankLast4: true },
  })
  if (!curator) return { ok: false, error: "That curator no longer exists." }

  // The figures stay frozen, but where it'll be paid to is whatever their Stripe account says now.
  const current = statement.snapshot as unknown as StatementSnapshot
  const bank = curator.stripeBankLast4 ? { bankName: curator.stripeBankName, last4: curator.stripeBankLast4 } : null
  if (JSON.stringify(current.bank) !== JSON.stringify(bank)) {
    statement.snapshot = { ...current, bank } as unknown as typeof statement.snapshot
    await prisma.royaltyStatement.update({ where: { id: statement.id }, data: { snapshot: statement.snapshot as object } })
  }

  // Sent documents aren't drafts, so render them without the watermark.
  const { snapshot, statementPdf, invoicePdf } = await statementDocuments({ ...statement, status: "sent" })
  const email = royaltyStatementEmail(snapshot, curator.firstName)

  try {
    await sendEmailPartnership({
      to: curator.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      attachments: [
        { filename: `AviPrep-Royalty-Statement-${snapshot.number}.pdf`, content: statementPdf, contentType: "application/pdf" },
        ...(invoicePdf ? [{ filename: `AviPrep-RCTI-${snapshot.number}.pdf`, content: invoicePdf, contentType: "application/pdf" }] : []),
      ],
    })
  } catch (error) {
    console.error("Royalty statement email failed:", error)
    return { ok: false, error: `The email to ${curator.email} didn't send.` }
  }

  await prisma.royaltyStatement.update({
    where: { id: statement.id },
    data: { status: statement.status === "paid" ? "paid" : "sent", sentAt: new Date(), sentTo: curator.email },
  })
  return { ok: true }
}
