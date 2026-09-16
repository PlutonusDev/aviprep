/**
 * Removes bank details stored on Curator records before payouts moved to
 * Stripe. Prisma no longer knows these fields, so they're unset directly.
 *
 *   npx tsx scripts/purge-curator-bank-details.ts
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const result = await prisma.$runCommandRaw({
    update: "Curator",
    updates: [
      {
        q: {},
        u: { $unset: { bankAccountName: "", bankBsb: "", bankAccountNumber: "", bankName: "" } },
        multi: true,
      },
    ],
  })
  console.log("Bank details removed:", JSON.stringify(result))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
