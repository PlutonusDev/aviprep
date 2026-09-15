import "server-only"

import { prisma } from "@lib/prisma"

/**
 * Site-wide switches an admin can flip without a deploy.
 *
 * Read on every sign-up request, so values are cached in memory briefly. Writes
 * clear the cache, so a change applies straight away on this server instance
 * (and within CACHE_MS on any others).
 */

export interface RegistrationSetting {
  open: boolean
  /** Shown on the sign-up page while closed. */
  message: string
}

const DEFAULT_REGISTRATION: RegistrationSetting = { open: true, message: "" }
const KEY = "registration"
const CACHE_MS = 30_000

let cached: { value: RegistrationSetting; expires: number } | null = null

export async function getRegistrationSetting(): Promise<RegistrationSetting> {
  if (cached && cached.expires > Date.now()) return cached.value
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: KEY } })
    const stored = (row?.value ?? {}) as Partial<RegistrationSetting>
    const value = {
      open: typeof stored.open === "boolean" ? stored.open : DEFAULT_REGISTRATION.open,
      message: typeof stored.message === "string" ? stored.message : DEFAULT_REGISTRATION.message,
    }
    cached = { value, expires: Date.now() + CACHE_MS }
    return value
  } catch (error) {
    // Don't cache a failure; fall back to the default (open).
    console.error("Couldn't read registration setting:", error)
    return DEFAULT_REGISTRATION
  }
}

export async function setRegistrationSetting(value: RegistrationSetting, updatedById: string) {
  const clean = { open: !!value.open, message: String(value.message ?? "").slice(0, 500) }
  await prisma.siteSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: clean, updatedById },
    update: { value: clean, updatedById },
  })
  cached = { value: clean, expires: Date.now() + CACHE_MS }
  return clean
}

export const REGISTRATION_CLOSED_ERROR = "New registrations are currently closed."
