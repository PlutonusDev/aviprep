/**
 * AviPrep as it appears on invoices and statements. The GST setting is shared
 * with lib/curators/royalties.ts: set AVIPREP_GST_REGISTERED=false if AviPrep
 * isn't registered, and no GST is taken out of sales or added to RCTIs.
 */

export const BUSINESS = {
  tradingName: "AviPrep",
  legalName: "Hughes, Joshua James",
  abn: "80167432520",
  email: "hello@aviprep.com.au",
  website: "aviprep.com.au",
  address: process.env.AVIPREP_ADDRESS || null,
} as const

export const aviprepGstRegistered = () => process.env.AVIPREP_GST_REGISTERED !== "false"

/**
 * What a curator sees on their bank statement when a royalty lands. Stripe
 * allows 5-22 Latin characters and rejects <>'"* and digits-only.
 */
export const payoutDescriptor = () => {
  const raw = process.env.AVIPREP_PAYOUT_DESCRIPTOR || "AVIPREP ROYALTIES"
  const clean = raw.replace(/[<>\'"*]/g, "").replace(/\s+/g, " ").trim().slice(0, 22)
  return clean.length >= 5 && /[A-Za-z]/.test(clean) ? clean : "AVIPREP ROYALTIES"
}

/** Educational services. Stripe asks connected accounts for this; prefilling saves them a question. */
export const MERCHANT_CATEGORY_CODE = "8299"
