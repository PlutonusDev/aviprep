/**
 * Which parts of the student product a school can switch off, and which are
 * never available on a white-label subdomain at all.
 *
 * One registry so the sidebar, the route guard and the school's settings screen
 * agree. Adding a feature here is enough to make it appear in all three.
 */

export type TenantFeature =
  | "learn"
  | "forums"
  | "messages"
  | "insights"
  | "statistics"
  | "history"

export interface TenantFeatureDef {
  key: TenantFeature
  label: string
  description: string
  /** Route prefixes this feature owns. Used by the guard and the nav filter. */
  paths: string[]
}

export const TENANT_FEATURES: TenantFeatureDef[] = [
  {
    key: "learn",
    label: "Subject courses",
    description: "Lesson content, flash cards and quizzes.",
    paths: ["/dashboard/learn"],
  },
  {
    key: "forums",
    label: "Forums",
    description: "Community discussion boards shared across AviPrep.",
    paths: ["/dashboard/forum"],
  },
  {
    key: "messages",
    label: "Messages",
    description: "Direct messages between students.",
    paths: ["/dashboard/messages"],
  },
  {
    key: "insights",
    label: "AI insights",
    description: "Personalised study recommendations.",
    paths: ["/dashboard/insights"],
  },
  {
    key: "statistics",
    label: "Statistics",
    description: "Detailed performance breakdowns.",
    paths: ["/dashboard/statistics"],
  },
  {
    key: "history",
    label: "Exam history",
    description: "Past exam attempts and results.",
    paths: ["/dashboard/history"],
  },
]

/**
 * AviPrep's own commerce. A school's students get access through the school, so
 * this is hidden on every tenant subdomain - it is not an admin choice.
 */
export const TENANT_HIDDEN_PATHS = ["/dashboard/pricing", "/dashboard/checkout"]

export function isValidFeature(key: string): key is TenantFeature {
  return TENANT_FEATURES.some((f) => f.key === key)
}

/** Keeps unknown or malformed values out of the database. */
export function sanitiseDisabledFeatures(input: unknown): TenantFeature[] {
  if (!Array.isArray(input)) return []
  return Array.from(new Set(input.filter((v): v is TenantFeature => typeof v === "string" && isValidFeature(v))))
}

function matches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

/**
 * True when a path must not be reachable for this tenant - either because the
 * school disabled it, or because it is AviPrep-only.
 *
 * `disabled` is ignored when there is no tenant: the main site has everything.
 */
export function isPathBlocked({
  pathname,
  isTenant,
  disabledFeatures,
}: {
  pathname: string
  isTenant: boolean
  disabledFeatures: string[]
}): boolean {
  if (!isTenant) return false

  if (TENANT_HIDDEN_PATHS.some((p) => matches(pathname, p))) return true

  return TENANT_FEATURES.filter((f) => disabledFeatures.includes(f.key)).some((f) =>
    f.paths.some((p) => matches(pathname, p)),
  )
}
