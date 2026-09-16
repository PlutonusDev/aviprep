import "server-only"

import { prisma } from "@lib/prisma"
import { sendEmailSupport } from "@lib/email"
import { runOnce } from "@lib/jobs"
import { statementsReadyEmail } from "@lib/email-statements-ready"
import { periodAt, periodLabel, shiftPeriod } from "./money"
import { generateStatements, paymentIssues, PAYMENT_SELECT } from "./payouts"

/**
 * On the 1st of each month (Sydney time), statements and RCTIs for the month
 * just finished are generated as drafts, and admins are emailed the totals.
 * Nothing goes to curators until an admin reviews and sends them.
 *
 * The check runs hourly (instrumentation.ts) and can also be triggered by an
 * external scheduler (/api/cron/monthly-statements). If the server was down on
 * the 1st, the next check catches up; runOnce makes sure it only happens once.
 */

export const jobKey = (period: string) => `statements:${period}`

export async function runMonthlyStatements(now = new Date()) {
  const period = shiftPeriod(periodAt(now), -1)

  return runOnce(jobKey(period), async () => {
    const generated = await generateStatements(period, null)
    const statements = await prisma.royaltyStatement.findMany({ where: { period, status: { not: "void" } } })
    const curators = await prisma.curator.findMany({ where: { id: { in: statements.map((s) => s.curatorId) } }, select: PAYMENT_SELECT })

    const totals = {
      statements: statements.length,
      royaltyCents: statements.reduce((n, s) => n + s.royaltyCents, 0),
      gstCents: statements.reduce((n, s) => n + s.gstCents, 0),
      withholdingCents: statements.reduce((n, s) => n + s.withholdingCents, 0),
      payableCents: statements.reduce((n, s) => n + s.payableCents, 0),
      invoices: statements.filter((s) => s.invoiceKind !== "none").length,
      needAttention: curators.filter((c) => paymentIssues(c).length).length,
    }

    const admins = await prisma.user.findMany({ where: { isAdmin: true }, select: { email: true, firstName: true } })
    // The admin panel lives on the main site.
    const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://aviprep.com.au").replace(/\/$/, "")
    const email = statementsReadyEmail({ period, label: periodLabel(period), totals, url: `${site}/admin/payouts?period=${period}` })

    let emailed = 0
    for (const admin of admins) {
      try {
        await sendEmailSupport({ to: admin.email, subject: email.subject, html: email.html, text: email.text })
        emailed += 1
      } catch (error) {
        console.error("Statements ready email failed:", admin.email, error)
      }
    }

    return { period, generated, totals, emailed }
  })
}
