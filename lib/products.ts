import { SUBJECTS, LICENSE_TYPES, type LicenseType } from "./subjects"

export interface Product {
  id: string
  name: string
  description: string
  priceInCents: number
  type: "one-time" | "subscription"
  interval?: "month" | "quarter" | "year"
  intervalCount?: number
  features: string[]
  category: "bundle" | "subject" | "addon"
  subjectId?: string
  licenseType?: LicenseType
  tier?: "exams-only" | "with-learning"
  stripeProductId?: string
  stripePriceId?: string
  comingSoon?: boolean
}

// Bundle products for each license type
export const BUNDLES: Product[] = [
  {
    id: "rpl-bundle",
    name: "RPL Complete Bundle",
    description: "Full access to all RPL subjects with exams and learning content",
    priceInCents: 9900, // $99/quarter
    type: "subscription",
    interval: "month",
    intervalCount: 3,
    features: [
      "All 3 RPL subjects",
      "Exams + Learning content",
      "Unlimited practice exams",
      "AI-powered insights",
      "Progress tracking",
    ],
    category: "bundle",
    licenseType: "rpl",
    stripeProductId: "prod_rpl_bundle",
    stripePriceId: "price_rpl_bundle",
  },
  {
    id: "ppl-bundle",
    name: "PPL Complete Bundle",
    description: "Full access to all PPL subjects with exams and learning content",
    priceInCents: 14900, // $149/quarter
    type: "subscription",
    interval: "month",
    intervalCount: 3,
    features: [
      "All 6 PPL subjects",
      "Exams + Learning content",
      "Unlimited practice exams",
      "AI-powered insights",
      "Detailed statistics",
      "Print exams & results",
    ],
    category: "bundle",
    licenseType: "ppl",
    stripeProductId: "prod_ppl_bundle",
    stripePriceId: "price_ppl_bundle",
  },
  {
    id: "cpl-bundle",
    name: "CPL Complete Bundle",
    description: "Full access to all CPL subjects with exams and learning content",
    priceInCents: 19900, // $199/quarter
    type: "subscription",
    interval: "month",
    intervalCount: 3,
    features: [
      "All 7 CPL subjects",
      "Exams + Learning content",
      "Unlimited practice exams",
      "AI-powered insights",
      "Detailed statistics",
      "Print exams & results",
      "Priority support",
    ],
    category: "bundle",
    licenseType: "cpl",
    stripeProductId: "prod_TmXgjkC9sDgZap",
    stripePriceId: "price_1Soyc2DWxOVmL9hvB51YIZog",
  },
  {
    id: "irex-bundle",
    name: "IREX Complete Bundle",
    description: "Full access to all IREX subjects (Coming Soon)",
    priceInCents: 17900,
    type: "subscription",
    interval: "month",
    intervalCount: 3,
    features: ["All IREX subjects", "Exams + Learning content", "Coming Soon"],
    category: "bundle",
    licenseType: "irex",
    comingSoon: true,
  },
  {
    id: "atpl-bundle",
    name: "ATPL Complete Bundle",
    description: "Full access to all ATPL subjects (Coming Soon)",
    priceInCents: 24900,
    type: "subscription",
    interval: "month",
    intervalCount: 3,
    features: ["All ATPL subjects", "Exams + Learning content", "Coming Soon"],
    category: "bundle",
    licenseType: "atpl",
    comingSoon: true,
  },
]

// Generate individual subject products from SUBJECTS
export const SUBJECT_PRODUCTS: Product[] = SUBJECTS.flatMap((subject) => {
  const baseProduct = {
    subjectId: subject.id,
    licenseType: subject.licenseType,
    type: "one-time" as const,
    category: "subject" as const,
    comingSoon: subject.comingSoon,
  }

  return [
    {
      ...baseProduct,
      id: `${subject.id}-exams`,
      name: `${subject.name} - Exams Only`,
      description: `${subject.totalQuestions} practice questions for ${subject.name}`,
      priceInCents: subject.examOnlyPriceAud,
      tier: "exams-only" as const,
      features: [`${subject.totalQuestions} questions`, "12-month access", "Progress tracking", "Practice exams"],
    },
    {
      ...baseProduct,
      id: `${subject.id}-full`,
      name: `${subject.name} - Full Access`,
      description: `Complete learning content plus exams for ${subject.name}`,
      priceInCents: subject.withLearningPriceAud,
      tier: "with-learning" as const,
      features: [
        `${subject.totalQuestions} questions`,
        "12-month access",
        "Full learning content",
        "Practice exams",
        "Progress tracking",
        "Detailed explanations",
      ],
    },
  ]
})

// Add-ons
export const ADDONS: Product[] = [
  {
    id: "addon-printing",
    name: "Printing Feature",
    description: "Print practice exams and results for offline study",
    priceInCents: 900,
    type: "one-time",
    features: ["Print exams", "Print results", "PDF export"],
    category: "addon",
    stripeProductId: "prod_TmXgrMdBiHHCK5",
    stripePriceId: "price_1Soyc4DWxOVmL9hvp2Yvrva7",
  },
  {
    id: "addon-ai-insights",
    name: "AI Insights",
    description: "AI-powered analysis of your weak points and study recommendations",
    priceInCents: 1400,
    type: "one-time",
    features: ["Weak point analysis", "Study recommendations", "Progress predictions"],
    category: "addon",
    stripeProductId: "prod_TmXgdwqGzMvEY5",
    stripePriceId: "price_1Soyc4DWxOVmL9hvGh8MeGG0",
  },
]

export const ALL_PRODUCTS = [...BUNDLES, ...SUBJECT_PRODUCTS, ...ADDONS]

// Helper functions
export function getProductById(id: string): Product | undefined {
  return ALL_PRODUCTS.find((p) => p.id === id)
}

export function getProductByStripePriceId(priceId: string): Product | undefined {
  return ALL_PRODUCTS.find((p) => p.stripePriceId === priceId)
}

export function getBundleByLicense(licenseType: LicenseType): Product | undefined {
  return BUNDLES.find((b) => b.licenseType === licenseType)
}

export function getSubjectProductsByLicense(licenseType: LicenseType): Product[] {
  return SUBJECT_PRODUCTS.filter((p) => p.licenseType === licenseType)
}

export function calculateTotal(productIds: string[]): number {
  return productIds.reduce((total, id) => {
    const product = getProductById(id)
    return total + (product?.priceInCents || 0)
  }, 0)
}

export function getTotalValueByLicense(licenseType: LicenseType, tier: "exams-only" | "with-learning"): number {
  return SUBJECT_PRODUCTS.filter((p) => p.licenseType === licenseType && p.tier === tier).reduce(
    (sum, p) => sum + p.priceInCents,
    0
  )
}

// Legacy exports for backwards compatibility
export const CPL_BUNDLE = BUNDLES.find((b) => b.id === "cpl-bundle")!
export const SUBJECTS_LEGACY = SUBJECT_PRODUCTS.filter(
  (p) => p.licenseType === "cpl" && p.tier === "with-learning"
).map((p) => ({
  ...p,
  id: p.subjectId ?? p.id,
  features: p.features,
}))

// Re-export SUBJECTS from subjects.ts for backward compatibility
export { SUBJECTS } from "./subjects"

export const PRODUCTS: Record<
  string,
  {
    name: string
    description: string
    priceAud: number
    type: "bundle" | "subject" | "addon"
    stripePriceId?: string
    stripeProductId?: string
  }
> = Object.fromEntries(
  ALL_PRODUCTS.map((p) => [
    p.id,
    {
      name: p.name,
      description: p.description,
      priceAud: p.priceInCents,
      type: p.category,
      stripePriceId: p.stripePriceId,
      stripeProductId: p.stripeProductId,
    },
  ])
)

export type SubjectId = string

// Helper type for products with synced Stripe IDs
export interface ProductWithStripeIds extends Product {
  syncedStripeProductId?: string
  syncedStripePriceId?: string
}

// This function should be called server-side to get products with their actual Stripe IDs from the database
export async function getProductsWithStripeIds(
  prisma: { stripeProductMapping: { findMany: () => Promise<Array<{ internalProductId: string; stripeProductId: string; stripePriceId: string }>> } }
): Promise<ProductWithStripeIds[]> {
  const mappings = await prisma.stripeProductMapping.findMany()
  const mappingsByProductId = new Map(
    mappings.map((m) => [m.internalProductId, { stripeProductId: m.stripeProductId, stripePriceId: m.stripePriceId }])
  )

  return ALL_PRODUCTS.map((product) => {
    const mapping = mappingsByProductId.get(product.id)
    return {
      ...product,
      syncedStripeProductId: mapping?.stripeProductId || product.stripeProductId,
      syncedStripePriceId: mapping?.stripePriceId || product.stripePriceId,
    }
  })
}

// Get Stripe price ID for a product (for checkout) - use synced ID if available, fallback to static
export function getStripePriceIdForCheckout(
  productId: string,
  mappings?: Record<string, { stripeProductId: string; stripePriceId: string }>
): string | undefined {
  if (mappings && mappings[productId]) {
    return mappings[productId].stripePriceId
  }
  const product = getProductById(productId)
  return product?.stripePriceId
}
