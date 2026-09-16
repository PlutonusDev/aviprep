import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { CREDENTIALS_ERROR, australianMobile, checkDetails, checkPassword, readCredentials, readDetails } from "@lib/curators/details"
import { INVITE_UNAVAILABLE, findInvite } from "@lib/curators/invites"
import { sendOtp, signChallenge } from "@lib/otp"
import { maskPhone } from "@lib/sms"
import { isCuratorHost } from "@lib/tenant"

/**
 * Joining, step 1: checks the details and texts a code to the mobile given.
 * Nothing is created until the code comes back (join/complete).
 */
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

    const details = readDetails(body)
    const errors = checkDetails(details)
    const passwordError = checkPassword(body.password, found.invite.email)
    if (passwordError) errors.password = passwordError
    if (!readCredentials(body.credentials)) errors.credentials = CREDENTIALS_ERROR
    if (Object.keys(errors).length) {
      return NextResponse.json({ error: "Check the highlighted fields.", fields: errors }, { status: 400 })
    }

    if (await prisma.curator.findUnique({ where: { email: found.invite.email }, select: { id: true } })) {
      return NextResponse.json({ error: INVITE_UNAVAILABLE.accepted, restart: true }, { status: 409 })
    }

    const phone = australianMobile(details.phone)!
    const key = `curator-join:${found.invite.id}`
    const sent = await sendOtp({ purpose: "curator-join", key, phone })
    if (!sent.ok) {
      return NextResponse.json({ error: sent.error, retryAfter: sent.retryAfter }, { status: sent.status })
    }

    return NextResponse.json({
      challenge: await signChallenge({ purpose: "curator-join", key, phone }, 30),
      maskedPhone: maskPhone(phone),
    })
  } catch (error) {
    console.error("Curator join error:", error)
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 })
  }
}
