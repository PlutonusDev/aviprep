import "server-only"

import { randomUUID } from "crypto"
import { SignJWT, jwtVerify } from "jose"
import { prisma } from "@lib/prisma"
import { hashPassword, isValidARN, verifyPassword } from "@lib/auth"
import { highestCredential } from "./details"

/**
 * Curators in the community.
 *
 * The forums and private messages belong to members, and that's the point: a
 * curator should be able to answer a student in the thread where the student
 * asked, not in a staff room next door. So a curator joins as a member - their
 * own account, linked to their curator account - rather than as a second class
 * of person bolted onto every table.
 *
 * Most curators already have a member account, because most of them learned
 * here. Those are linked with their existing password rather than duplicated.
 *
 * The community lives on the main site and the studio lives on the curators
 * subdomain, so a cookie can't cross. A short-lived ticket does instead.
 */

const JWT_KEY = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-min-32-chars-long!")
/** Long enough to survive a redirect, short enough to be useless if it leaks. */
const TICKET_SECONDS = 90

export const MEMBER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  arn: true,
  profilePicture: true,
  isSuspendedFromForum: true,
} as const

export type Member = {
  id: string
  email: string
  firstName: string
  lastName: string
  arn: string
  profilePicture: string | null
  isSuspendedFromForum: boolean
}

/** The member account behind a curator, if they've joined the community. */
export async function linkedMember(curator: { userId?: string | null }): Promise<Member | null> {
  if (!curator.userId) return null
  return prisma.user.findUnique({ where: { id: curator.userId }, select: MEMBER_SELECT })
}

/**
 * A member account with the same email, waiting to be claimed. Only the email
 * is matched: they prove it's theirs with the password.
 */
export async function claimableAccount(email: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, firstName: true } })
  if (!user) return null
  // Already someone else's link. Shouldn't happen, but don't hand it over.
  const taken = await prisma.curator.findFirst({ where: { userId: user.id }, select: { id: true } })
  return taken ? null : user
}

export class CommunityError extends Error {
  constructor(
    message: string,
    readonly field?: string,
    readonly status = 400,
  ) {
    super(message)
  }
}

/** Links an existing member account, once they've proved it's theirs. */
export async function linkAccount(curatorId: string, email: string, password: string): Promise<Member> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } })
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new CommunityError("That email and password don't match an AviPrep account.", "password", 401)
  }
  const taken = await prisma.curator.findFirst({ where: { userId: user.id, NOT: { id: curatorId } }, select: { id: true } })
  if (taken) throw new CommunityError("That account is already linked to another curator.", "email", 409)

  const linking = await prisma.curator.findUnique({ where: { id: curatorId }, select: { credentials: true } })
  await prisma.user.update({
    where: { id: user.id },
    data: { isCurator: true, curatorCredential: highestCredential(linking?.credentials) },
  })
  await prisma.curator.update({ where: { id: curatorId }, data: { userId: user.id } })
  return (await prisma.user.findUnique({ where: { id: user.id }, select: MEMBER_SELECT }))!
}

/**
 * Creates a member account for a curator who doesn't have one. The ARN is the
 * only thing we don't already hold, and it's the one field members are unique
 * on besides email, so it has to come from them.
 */
export async function createAccount(
  curator: {
    id: string
    email: string
    firstName: string
    lastName: string
    phone: string
    phoneVerifiedAt: Date | null
    passwordHash: string
    profilePicture: string | null
    credentials: string[]
  },
  arn: string,
): Promise<Member> {
  const clean = arn.replace(/\s/g, "")
  if (!isValidARN(clean)) throw new CommunityError("An ARN is 6 or 7 digits.", "arn")

  if (await prisma.user.findUnique({ where: { email: curator.email }, select: { id: true } })) {
    throw new CommunityError("There's already an account with your email. Sign in to link it instead.", "email", 409)
  }
  if (await prisma.user.findUnique({ where: { arn: clean }, select: { id: true } })) {
    throw new CommunityError("That ARN already belongs to an AviPrep account. Link that account instead.", "arn", 409)
  }

  const user = await prisma.user.create({
    data: {
      email: curator.email,
      // Their studio password, so there's one password to remember. Changing
      // one doesn't change the other; the account is theirs from here.
      passwordHash: curator.passwordHash,
      arn: clean,
      firstName: curator.firstName,
      lastName: curator.lastName,
      phone: curator.phone,
      phoneVerifiedAt: curator.phoneVerifiedAt,
      emailVerifiedAt: new Date(),
      profilePicture: curator.profilePicture,
      isCurator: true,
      curatorCredential: highestCredential(curator.credentials),
    },
    select: MEMBER_SELECT,
  })

  await prisma.curator.update({ where: { id: curator.id }, data: { userId: user.id } })
  return user
}

/** Unlinks without deleting: the member account stays, and stays theirs. */
export async function unlinkAccount(curatorId: string, userId: string) {
  await prisma.curator.update({ where: { id: curatorId }, data: { userId: null } })
  await prisma.user.update({ where: { id: userId }, data: { isCurator: false, curatorCredential: null } }).catch(() => {})
}

/**
 * Keeps the badge in step. Called whenever a curator's credentials or their
 * access changes: a badge that says Grade 1 Instructor after they've stopped
 * being one is worse than no badge.
 */
export async function syncBadge(curatorId: string) {
  const curator = await prisma.curator.findUnique({
    where: { id: curatorId },
    select: { userId: true, isActive: true, credentials: true },
  })
  if (!curator?.userId) return
  await prisma.user
    .update({
      where: { id: curator.userId },
      data: {
        isCurator: curator.isActive,
        curatorCredential: curator.isActive ? highestCredential(curator.credentials) : null,
      },
    })
    .catch((error) => console.error("Couldn't sync the curator badge:", curatorId, error))
}

/* --- Crossing to the main site -------------------------------------------- */

/**
 * A one-use hand-off. The studio issues it, the main site redeems it and starts
 * a normal member session there, so from the forum's point of view a curator is
 * simply signed in.
 */
export async function issueTicket(curatorId: string, userId: string) {
  return new SignJWT({ kind: "curator-community", curatorId, userId, jti: randomUUID() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TICKET_SECONDS}s`)
    .sign(JWT_KEY)
}

/** Checks a ticket and re-checks the accounts behind it before signing anyone in. */
export async function redeemTicket(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_KEY)
    if (payload.kind !== "curator-community" || typeof payload.userId !== "string" || typeof payload.curatorId !== "string") {
      return null
    }

    // The link and the account must both still be good at the moment of entry,
    // not only at the moment the ticket was cut.
    const curator = await prisma.curator.findUnique({
      where: { id: payload.curatorId },
      select: { isActive: true, userId: true },
    })
    if (!curator?.isActive || curator.userId !== payload.userId) return null

    return prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, firstName: true, lastName: true, arn: true },
    })
  } catch {
    return null
  }
}

export { hashPassword }
