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
