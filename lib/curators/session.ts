import "server-only"

import { createHash } from "crypto"
import { cookies } from "next/headers"
import { SignJWT, jwtVerify } from "jose"
import { prisma } from "@lib/prisma"

/**
 * Curator sessions. A separate cookie from the member `session`, set only on
 * the curators subdomain, so a curator is never signed in to the main site and
 * a member session is never accepted in the studio.
 *
 * The token carries a fingerprint of the password hash: changing the password
 * signs out every other session. Deactivating the curator does the same,
 * because getCurator() checks the account on every request.
 */

export const CURATOR_COOKIE = "curator_session"
const MAX_AGE = 60 * 60 * 24 * 7

const JWT_KEY = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-min-32-chars-long!")

const fingerprint = (passwordHash: string) => createHash("sha256").update(passwordHash).digest("hex").slice(0, 24)

export async function startCuratorSession(curator: { id: string; passwordHash: string }) {
  const token = await new SignJWT({ kind: "curator-session", curatorId: curator.id, fp: fingerprint(curator.passwordHash) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_KEY)

  const cookieStore = await cookies()
  cookieStore.set(CURATOR_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  })
}

export async function endCuratorSession() {
  const cookieStore = await cookies()
  cookieStore.delete(CURATOR_COOKIE)
}

/** The signed-in, active curator, or null. */
export async function getCurator() {
  const cookieStore = await cookies()
  const token = cookieStore.get(CURATOR_COOKIE)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, JWT_KEY)
    if (payload.kind !== "curator-session" || typeof payload.curatorId !== "string") return null

    const curator = await prisma.curator.findUnique({ where: { id: payload.curatorId } })
    if (!curator || !curator.isActive || payload.fp !== fingerprint(curator.passwordHash)) return null
    return curator
  } catch {
    return null
  }
}
