import "server-only"

import { SignJWT, jwtVerify } from "jose"
import { prisma } from "@lib/prisma"
import { sendEmailWelcome } from "@lib/email"
import { getCustomTemplate } from "@lib/email-templates"

/**
 * Email address verification by link. Verification is a nudge, not a gate:
 * unverified members use the site normally and see a banner until they confirm.
 *
 * The link carries a signed token naming the user and the address it was sent
 * to, so it stops working if the address on the account ever changes.
 */

const JWT_KEY = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-min-32-chars-long!")
const LINK_TTL = "48h"
export const RESEND_COOLDOWN_MS = 60_000

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

/**
 * The public origin of a request. request.url can be the internal address
 * behind a reverse proxy, which would put an unreachable host in the email.
 */
export function requestOrigin(request: Request) {
  const url = new URL(request.url)
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host).split(",")[0].trim()
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ?? url.protocol.replace(":", "")
  // Headers can be forged. Only our own domains (and school subdomains) go into
  // an email link; anything else falls back to the configured site URL.
  const hostname = host.split(":")[0]
  const trusted = /(^|\.)aviprep\.com\.au$/i.test(hostname) || /(^|\.)localhost$/i.test(hostname)
  if (trusted) return `${proto === "http" ? "http" : "https"}://${host}`
  return process.env.NEXT_PUBLIC_SITE_URL || "https://aviprep.com.au"
}

export async function signEmailToken(userId: string, email: string) {
  return new SignJWT({ kind: "email-verify", userId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(LINK_TTL)
    .sign(JWT_KEY)
}

export async function readEmailToken(token: string | null): Promise<{ userId: string; email: string } | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, JWT_KEY)
    if (payload.kind !== "email-verify") return null
    return { userId: payload.userId as string, email: payload.email as string }
  } catch {
    return null
  }
}

export async function sendVerificationEmail({
  user,
  origin,
}: {
  user: { id: string; email: string; firstName: string }
  /** Where the link should point: the host they signed up on, so school students stay on their school's site. */
  origin: string
}) {
  const token = await signEmailToken(user.id, user.email)
  const link = `${origin}/api/auth/verify-email?token=${encodeURIComponent(token)}`

  const html = getCustomTemplate(
    `<h1 style="margin:0 0 16px;font-size:22px;color:#111">Confirm your email</h1>
<p style="margin:0 0 16px;line-height:1.6">Hi ${escape(user.firstName)}, tap the button below to confirm this is your email address.</p>
<p style="margin:24px 0">
  <a href="${link}" style="display:inline-block;background:#F78601;color:#111;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px">Confirm email</a>
</p>
<p style="margin:0 0 8px;line-height:1.6;color:#555;font-size:14px">The link works for 48 hours. If you didn't create an AviPrep account, you can ignore this email.</p>
<p style="margin:16px 0 0;line-height:1.6;color:#888;font-size:12px;word-break:break-all">Button not working? Paste this into your browser:<br>${link}</p>`,
    user.email,
  )

  await sendEmailWelcome({
    to: user.email,
    subject: "Confirm your email for AviPrep",
    text: `Hi ${user.firstName}, confirm your email for AviPrep: ${link}\n\nThe link works for 48 hours.`,
    html,
  })

  await prisma.user.update({ where: { id: user.id }, data: { emailVerificationSentAt: new Date() } })
}
