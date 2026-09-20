import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@lib/prisma"
import { hashPassword, isValidARN, isValidAustralianPhone, startSession, verifyToken } from "@lib/auth"
import { INVITE_UNAVAILABLE, acceptInvite, findInvite } from "@lib/school/invites"

/**
 * Accepting an instructor invite. Two ways in, decided by whether an AviPrep
 * account already uses the invited address:
 *   { token }                     the person is signed in as that address
 *   { token, password, ... }      no account yet, so one is made and signed in
 *
 * The invited address is the whole authority here. Signing in as someone else
 * and posting the token gets nowhere.
 */

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const found = await findInvite(body.token)
  if (!found) return NextResponse.json({ error: "That invite link isn't valid." }, { status: 404 })

  const { invite, status } = found
  if (status !== "pending") return NextResponse.json({ error: INVITE_UNAVAILABLE[status] }, { status: 410 })

  const school = await prisma.flightSchool.findUnique({
    where: { id: invite.flightSchoolId },
    select: { id: true, name: true, isActive: true },
  })
  if (!school?.isActive) return NextResponse.json({ error: "That school is no longer active." }, { status: 410 })

  const existing = await prisma.user.findUnique({ where: { email: invite.email } })

  /* --- They already have an account: they must be signed in as it ----------- */
  if (existing) {
    const token = (await cookies()).get("session")?.value
    const payload = token ? await verifyToken(token) : null
    if (!payload || payload.userId !== existing.id) {
      return NextResponse.json({ error: "Sign in as " + invite.email + " to accept this invite.", needsSignIn: true }, { status: 401 })
    }
    if (existing.flightSchoolId && existing.flightSchoolId !== school.id) {
      return NextResponse.json({ error: "That account is a student at another school." }, { status: 409 })
    }
    await acceptInvite(invite.id, school.id, existing.id)
    return NextResponse.json({ success: true, schoolName: school.name })
  }

  /* --- New account ---------------------------------------------------------- */
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : ""
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : ""
  const phone = typeof body.phone === "string" ? body.phone.trim() : ""
  const arn = typeof body.arn === "string" ? body.arn.trim() : ""
  const password = typeof body.password === "string" ? body.password : ""

  if (!firstName || !lastName) return NextResponse.json({ error: "Tell us your name." }, { status: 422 })
  if (!isValidAustralianPhone(phone)) return NextResponse.json({ error: "That isn't an Australian mobile number." }, { status: 422 })
  if (!isValidARN(arn)) return NextResponse.json({ error: "That isn't a valid ARN." }, { status: 422 })
  if (password.length < 8) return NextResponse.json({ error: "Passwords need at least 8 characters." }, { status: 422 })

  const arnTaken = await prisma.user.findUnique({ where: { arn }, select: { id: true } })
  if (arnTaken) return NextResponse.json({ error: "An account already uses that ARN. Sign in instead." }, { status: 409 })

  const user = await prisma.user.create({
    data: {
      email: invite.email,
      firstName,
      lastName,
      phone,
      arn,
      passwordHash: await hashPassword(password),
      // An instructor is staff of the school, not one of its students, so
      // flightSchoolId stays empty - that field is what makes someone a student.
      isFlightSchoolAdmin: true,
      emailVerifiedAt: new Date(),
    },
  })

  await acceptInvite(invite.id, school.id, user.id)
  await startSession({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, arn: user.arn })

  return NextResponse.json({ success: true, schoolName: school.name })
}
