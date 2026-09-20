import "server-only"

import { cookies, headers } from "next/headers"
import { SignJWT, jwtVerify } from "jose"
import { prisma } from "@lib/prisma"
import { DEMO_COOKIE, grantStatus, hashCode, normaliseCode } from "./codes"

export { DEMO_COOKIE, DEFAULT_TTL_DAYS, codeHint, grantStatus, hashCode, newCode, normaliseCode, type GrantStatus } from "./codes"

/**
 * Who may open the demo portal.
 *
 * An admin creates a grant for one organisation, and AviPrep emails them a
 * code. Entering it sets a cookie for that grant; the pages check it on every
 * navigation, so revoking a grant closes the portal on the next click.
 */

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-min-32-chars-long!")

/** Where the demo lives, for the link in the email. */
export async function demoOrigin() {
  const host = (await headers()).get("host") ?? "aviprep.com.au"
  return host.startsWith("localhost") || host.startsWith("127.") ? `http://${host}` : `https://${host}`
}

/* --- The session ------------------------------------------------------------- */

export async function startDemoSession(grantId: string, expiresAt: Date) {
  const token = await new SignJWT({ grantId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(SECRET)

  const store = await cookies()
  store.set(DEMO_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  })
}

export async function endDemoSession() {
  ;(await cookies()).delete(DEMO_COOKIE)
}

export interface DemoViewer {
  grantId: string
  organisation: string
}

/**
 * The organisation looking at the portal, or null. Checks the grant each time
 * rather than trusting the cookie alone, so a revoked code stops working now
 * instead of whenever it would have expired.
 */
export async function demoViewer(): Promise<DemoViewer | null> {
  const token = (await cookies()).get(DEMO_COOKIE)?.value
  if (!token) return null

  let grantId: string
  try {
    const { payload } = await jwtVerify(token, SECRET)
    grantId = String(payload.grantId ?? "")
  } catch {
    return null
  }
  if (!/^[a-f0-9]{24}$/i.test(grantId)) return null

  try {
    const grant = await prisma.demoGrant.findUnique({
      where: { id: grantId },
      select: { id: true, organisation: true, expiresAt: true, revokedAt: true },
    })
    if (!grant || grantStatus(grant) !== "active") return null
    return { grantId: grant.id, organisation: grant.organisation }
  } catch (error) {
    // A database problem sends them back to the code screen rather than
    // opening the portal on an unverified cookie.
    console.error("Demo access check failed:", error)
    return null
  }
}

/** Matches a typed code to a live grant. */
export async function grantForCode(raw: string) {
  const code = normaliseCode(raw)
  if (code.length < 6 || code.length > 20) return null

  const grant = await prisma.demoGrant.findUnique({ where: { codeHash: hashCode(code) } })
  if (!grant) return null
  return { grant, status: grantStatus(grant) }
}

export async function recordOpen(grantId: string) {
  const now = new Date()
  const grant = await prisma.demoGrant.findUnique({ where: { id: grantId }, select: { firstOpenedAt: true } })
  await prisma.demoGrant.update({
    where: { id: grantId },
    data: {
      opens: { increment: 1 },
      lastOpenedAt: now,
      ...(grant?.firstOpenedAt ? {} : { firstOpenedAt: now }),
    },
  })
}
