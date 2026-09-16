import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { startCuratorSession } from "@lib/curators/session"
import { checkOtp, readChallenge } from "@lib/otp"
import { isCuratorHost } from "@lib/tenant"

/** Curator sign-in, step 2: the texted code. */
export async function POST(request: Request) {
  if (!isCuratorHost(request.headers.get("host") ?? "")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const challenge = await readChallenge(body.challenge, "curator-login")
    if (!challenge?.userId) {
      return NextResponse.json({ error: "This sign-in timed out. Start again.", restart: true }, { status: 400 })
    }

    const result = await checkOtp({ purpose: "curator-login", key: challenge.key, code: body.code })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

    const curator = await prisma.curator.findUnique({ where: { id: challenge.userId } })
    if (!curator || !curator.isActive) {
      return NextResponse.json({ error: "This account isn't available.", restart: true }, { status: 403 })
    }

    await prisma.curator.update({ where: { id: curator.id }, data: { lastLoginAt: new Date() } })
    await startCuratorSession(curator)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Curator login verify error:", error)
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 })
  }
}
