import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { getCurator } from "@lib/curators/session"
import { payoutAccountStatus, syncAccount } from "@lib/finance/connect"
import { identityStatus, syncVerification } from "@lib/finance/identity"
import { financialYearPeriods, periodAt, periodLabel } from "@lib/finance/money"
import type { StatementSnapshot } from "@lib/finance/payouts"

export const dynamic = "force-dynamic"

/** A curator's payout account (masked) and every statement an admin has sent them. */
export async function GET(request: Request) {
  let curator = await getCurator()
  if (!curator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Coming back from Stripe, or stale: check their account before showing it.
  const returning = new URL(request.url).searchParams.get("sync") === "1"
  if (curator.identitySessionId && curator.identityStatus !== "verified" && (returning || curator.identityStatus === "processing")) {
    await syncVerification(curator.identitySessionId).catch((error) => console.error("Identity sync failed:", error))
    curator = (await prisma.curator.findUnique({ where: { id: curator.id } })) ?? curator
  }
  if (curator.stripeAccountId && (returning || !curator.stripeSyncedAt || Date.now() - curator.stripeSyncedAt.getTime() > 10 * 60_000)) {
    await syncAccount(curator.stripeAccountId).catch((error) => console.error("Earnings sync failed:", error))
    curator = (await prisma.curator.findUnique({ where: { id: curator.id } })) ?? curator
  }

  const statements = await prisma.royaltyStatement.findMany({
    where: { curatorId: curator.id, status: { in: ["sent", "paid"] } },
    orderBy: { period: "desc" },
  })

  const fy = financialYearPeriods(periodAt(new Date()))
  const thisYear = statements.filter((s) => fy.periods.includes(s.period))

  return NextResponse.json({
    identity: { status: identityStatus(curator), error: curator.identityError },
    payouts: {
      status: payoutAccountStatus(curator),
      requirementsDue: curator.stripeRequirementsDue ?? 0,
      bankName: curator.stripeBankName,
      last4: curator.stripeBankLast4,
    },
    tax: {
      status: curator.taxStatus,
      gstRegistered: !!curator.gstRegistered,
      hasAbn: !!curator.abn,
    },
    financialYear: {
      label: fy.label,
      royaltyCents: thisYear.reduce((n, s) => n + s.royaltyCents, 0),
      gstCents: thisYear.reduce((n, s) => n + s.gstCents, 0),
      withholdingCents: thisYear.reduce((n, s) => n + s.withholdingCents, 0),
      paidCents: thisYear.filter((s) => s.status === "paid").reduce((n, s) => n + s.payableCents, 0),
    },
    statements: statements.map((s) => {
      const snapshot = s.snapshot as unknown as StatementSnapshot
      return {
        id: s.id,
        number: s.number,
        period: s.period,
        label: periodLabel(s.period),
        status: s.status,
        royaltyCents: s.royaltyCents,
        gstCents: s.gstCents,
        withholdingCents: s.withholdingCents,
        payableCents: s.payableCents,
        invoiceKind: s.invoiceKind,
        sentAt: s.sentAt,
        paidAt: s.paidAt,
        subjects: snapshot.lines?.length ?? 0,
      }
    }),
  })
}
