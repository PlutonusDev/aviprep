import "server-only"

import { createHmac, randomInt, timingSafeEqual } from "crypto"
import { SignJWT, jwtVerify } from "jose"
import { prisma } from "@lib/prisma"
import { sendSms, toE164AustralianMobile } from "@lib/sms"

/**
 * One-time SMS codes.
 *
 * - 6 digits, valid for 10 minutes, stored only as an HMAC.
 * - 5 wrong guesses burns the code.
 * - One send per minute and five per hour for the same person and purpose.
 * - Sending a new code retires the previous one.
 *
 * Between "send" and "verify" the browser holds a signed challenge token that
 * says what the code is for, so no half-finished state lives in a cookie.
 */

export type OtpPurpose = "signup" | "login" | "reset" | "delete" | "waitlist" | "curator-join" | "curator-login"

export const OTP_LENGTH = 6
const TTL_MS = 10 * 60_000
const COOLDOWN_MS = 60_000
const HOURLY_LIMIT = 5
const MAX_ATTEMPTS = 5

const SECRET = process.env.JWT_SECRET || "your-secret-key-min-32-chars-long!"
const JWT_KEY = new TextEncoder().encode(SECRET)

const WHAT_FOR: Record<OtpPurpose, string> = {
  signup: "to confirm your mobile",
  login: "to sign in",
  reset: "to reset your password",
  delete: "to confirm closing your account",
  waitlist: "to join the waitlist",
  "curator-join": "to set up your curator account",
  "curator-login": "to sign in to the content studio",
}

function hash(purpose: OtpPurpose, key: string, code: string) {
  return createHmac("sha256", SECRET).update(`${purpose}:${key}:${code}`).digest("hex")
}

function smsBody(purpose: OtpPurpose, code: string) {
  const lines = [`Your one-time code is ${code}. It expires in 10 minutes.`]
  // Domain-bound line lets browsers offer the code automatically (WebOTP).
  try {
    const host = new URL(process.env.NEXT_PUBLIC_SITE_URL || "").host.split(":")[0]
    if (host && host !== "localhost") lines.push("", `@${host} #${code}`)
  } catch {
    // No site URL configured; skip autofill.
  }
  return lines.join("\n")
}

/**
 * Flat rather than a discriminated union: the project compiles with
 * strict: false, where `if (!result.ok)` doesn't narrow a union.
 */
export interface SendResult {
  ok: boolean
  /** Set when ok is false. */
  error?: string
  retryAfter?: number
  /** HTTP status to report; 200 when ok. */
  status: number
}

export async function sendOtp({ purpose, key, phone }: { purpose: OtpPurpose; key: string; phone: string }): Promise<SendResult> {
  const to = toE164AustralianMobile(phone)
  if (!to) return { ok: false, error: "That mobile number can't receive codes.", status: 400 }

  const now = Date.now()
  const recent = await prisma.otpCode.findMany({
    where: { purpose, key, createdAt: { gte: new Date(now - 60 * 60_000) } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  })

  const sinceLast = recent[0] ? now - recent[0].createdAt.getTime() : Infinity
  if (sinceLast < COOLDOWN_MS) {
    const retryAfter = Math.ceil((COOLDOWN_MS - sinceLast) / 1000)
    return { ok: false, error: `Wait ${retryAfter}s before asking for another code.`, retryAfter, status: 429 }
  }
  if (recent.length >= HOURLY_LIMIT) {
    return { ok: false, error: "Too many codes requested. Try again in an hour.", status: 429 }
  }

  const code = String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0")

  await prisma.otpCode.updateMany({ where: { purpose, key, consumed: false }, data: { consumed: true } })
  const record = await prisma.otpCode.create({
    data: { purpose, key, phone: to, codeHash: hash(purpose, key, code), expiresAt: new Date(now + TTL_MS) },
  })

  const sent = await sendSms(to, smsBody(purpose, code))
  if (!sent.ok) {
    await prisma.otpCode.update({ where: { id: record.id }, data: { consumed: true } })
    return { ok: false, error: "We couldn't send the text. Try again shortly.", status: 502 }
  }
  return { ok: true, status: 200 }
}

export interface CheckResult {
  ok: boolean
  error?: string
}

export async function checkOtp({ purpose, key, code }: { purpose: OtpPurpose; key: string; code: string }): Promise<CheckResult> {
  const clean = String(code ?? "").replace(/\D/g, "")
  if (clean.length !== OTP_LENGTH) return { ok: false, error: `Enter the ${OTP_LENGTH}-digit code.` }

  const record = await prisma.otpCode.findFirst({
    where: { purpose, key, consumed: false },
    orderBy: { createdAt: "desc" },
  })
  if (!record || record.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "That code has expired. Send a new one." }
  }

  const expected = Buffer.from(record.codeHash, "hex")
  const given = Buffer.from(hash(purpose, key, clean), "hex")
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    const attempts = record.attempts + 1
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { attempts, consumed: attempts >= MAX_ATTEMPTS },
    })
    return attempts >= MAX_ATTEMPTS
      ? { ok: false, error: "Too many wrong tries. Send a new code." }
      : { ok: false, error: "That code isn't right." }
  }

  await prisma.otpCode.update({ where: { id: record.id }, data: { consumed: true } })
  return { ok: true }
}

/* --- Challenge tokens --------------------------------------------------------- */

/**
 * Signed, not encrypted: anyone holding one can read it. So it never carries a
 * phone number or anything else the holder shouldn't learn - the phone is looked
 * up again server-side when needed. Only sign-up includes the phone, which is
 * the number the person just typed in.
 */
export interface Challenge {
  purpose: OtpPurpose
  /** Same key the code was issued under. */
  key: string
  /** Sign-up, waitlist and curator join only: the number the person just typed in. */
  phone?: string
  /** Login and closure only, where the person has already proven who they are. A Curator id for curator-login. */
  userId?: string
  /** Password reset: the email typed in, whether or not it has an account. */
  email?: string
}

export async function signChallenge(challenge: Challenge, minutes = 20): Promise<string> {
  return new SignJWT({ ...challenge, kind: "otp-challenge" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${minutes}m`)
    .sign(JWT_KEY)
}

export async function readChallenge(token: unknown, purpose?: OtpPurpose): Promise<Challenge | null> {
  if (typeof token !== "string" || !token) return null
  try {
    const { payload } = await jwtVerify(token, JWT_KEY)
    if (payload.kind !== "otp-challenge") return null
    if (purpose && payload.purpose !== purpose) return null
    return {
      purpose: payload.purpose as OtpPurpose,
      key: payload.key as string,
      phone: payload.phone as string | undefined,
      userId: payload.userId as string | undefined,
      email: payload.email as string | undefined,
    }
  } catch {
    return null
  }
}

/** Proof, after a successful sign-up code, that this phone was verified. */
export async function signPhoneProof(phone: string): Promise<string> {
  return new SignJWT({ kind: "phone-verified", phone })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(JWT_KEY)
}

export async function readPhoneProof(token: unknown): Promise<string | null> {
  if (typeof token !== "string" || !token) return null
  try {
    const { payload } = await jwtVerify(token, JWT_KEY)
    return payload.kind === "phone-verified" ? (payload.phone as string) : null
  } catch {
    return null
  }
}
