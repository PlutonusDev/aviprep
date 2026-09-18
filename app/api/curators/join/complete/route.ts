import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { hashPassword } from "@lib/auth"
import { australianMobile, checkDetails, checkPassword, readCredentials, readDetails } from "@lib/curators/details"
import { INVITE_UNAVAILABLE, findInvite, notAccepted, notRevoked } from "@lib/curators/invites"
import { startCuratorSession } from "@lib/curators/session"
import { checkOtp, readChallenge } from "@lib/otp"
import { isCuratorHost } from "@lib/tenant"

/** Joining, step 2: the texted code. Creates the account and signs them in. */
export async function POST(request: Request) {
  if (!isCuratorHost(request.headers.get("host") ?? "")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const found = await findInvite(body.token)
    if (!found) return NextResponse.json({ error: "This invite link isn't valid.", restart: true }, { status: 404 })
    if (found.status !== "pending") {
      return NextResponse.json({ error: INVITE_UNAVAILABLE[found.status], restart: true }, { status: 410 })
    }
    const { invite } = found

    const challenge = await readChallenge(body.challenge, "curator-join")
    if (!challenge || challenge.key !== `curator-join:${invite.id}`) {
      return NextResponse.json({ error: "This code timed out. Send a new one.", back: true }, { status: 400 })
    }

    // The details are sent again rather than trusted from step 1, so check them again.
    const details = readDetails(body)
    const passwordError = checkPassword(body.password, invite.email)
    const credentials = readCredentials(body.credentials)
    if (Object.keys(checkDetails(details)).length || passwordError || !credentials) {
      return NextResponse.json({ error: "Some of your details need another look.", back: true }, { status: 400 })
    }
    const phone = australianMobile(details.phone)!
    if (challenge.phone !== phone) {
      return NextResponse.json({ error: "Your mobile changed. Send a code to the new number.", back: true }, { status: 400 })
    }

    const result = await checkOtp({ purpose: "curator-join", key: challenge.key, code: body.code })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

    if (await prisma.curator.findUnique({ where: { email: invite.email }, select: { id: true } })) {
      return NextResponse.json({ error: INVITE_UNAVAILABLE.accepted, restart: true }, { status: 409 })
    }

    const now = new Date()
    const curator = await prisma.curator.create({
      data: {
        email: invite.email,
        passwordHash: await hashPassword(body.password),
        firstName: details.firstName,
        lastName: details.lastName,
        phone,
        phoneVerifiedAt: now,
        credentials,
        lastLoginAt: now,
        invitedById: invite.invitedById,
      },
    })

    await prisma.curatorInvite.update({ where: { id: invite.id }, data: { acceptedAt: now, curatorId: curator.id } })
    // Any other open invites to the same address are now moot.
    await prisma.curatorInvite.updateMany({
      where: { email: invite.email, id: { not: invite.id }, AND: [notAccepted, notRevoked] },
      data: { revokedAt: now },
    })

    await startCuratorSession(curator)
    return NextResponse.json({ success: true, firstName: curator.firstName })
  } catch (error) {
    console.error("Curator join complete error:", error)
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 })
  }
}
