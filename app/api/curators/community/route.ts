import { NextResponse } from "next/server"
import { getCurator } from "@lib/curators/session"
import {
  CommunityError,
  claimableAccount,
  createAccount,
  linkAccount,
  linkedMember,
  unlinkAccount,
} from "@lib/curators/community"

export const dynamic = "force-dynamic"

/** Whether this curator is in the community, and how they'd get in if not. */
export async function GET() {
  const curator = await getCurator()
  if (!curator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const member = await linkedMember(curator)
  const claimable = member ? null : await claimableAccount(curator.email)

  return NextResponse.json({
    email: curator.email,
    member: member && {
      id: member.id,
      name: `${member.firstName} ${member.lastName}`.trim(),
      email: member.email,
      arn: member.arn,
      profilePicture: member.profilePicture,
      suspended: member.isSuspendedFromForum,
    },
    // An account with their email is waiting: they sign in to claim it rather
    // than ending up with two accounts and half a history in each.
    claimable: claimable ? { firstName: claimable.firstName } : null,
  })
}

/** Links an existing account, or creates one. */
export async function POST(request: Request) {
  const curator = await getCurator()
  if (!curator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (curator.userId) return NextResponse.json({ error: "You're already in the community." }, { status: 409 })

  try {
    const body = await request.json().catch(() => ({}))
    const member =
      body.action === "link"
        ? await linkAccount(curator.id, curator.email, typeof body.password === "string" ? body.password : "")
        : await createAccount(curator, typeof body.arn === "string" ? body.arn : "")

    return NextResponse.json({ member: { id: member.id, name: `${member.firstName} ${member.lastName}`.trim(), email: member.email } })
  } catch (error) {
    if (error instanceof CommunityError) {
      return NextResponse.json({ error: error.message, fields: error.field ? { [error.field]: error.message } : undefined }, { status: error.status })
    }
    console.error("Curator community join failed:", curator.id, error)
    return NextResponse.json({ error: "That didn't work. Try again." }, { status: 500 })
  }
}

/** Leaves the community. The member account itself is kept. */
export async function DELETE() {
  const curator = await getCurator()
  if (!curator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!curator.userId) return NextResponse.json({ error: "Nothing linked." }, { status: 400 })

  await unlinkAccount(curator.id, curator.userId)
  return NextResponse.json({ ok: true })
}
