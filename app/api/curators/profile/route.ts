import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { getCurator } from "@lib/curators/session"
import { checkDetails } from "@lib/curators/details"

const tidy = (value: unknown) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "")

function shape(curator: NonNullable<Awaited<ReturnType<typeof getCurator>>>) {
  return {
    firstName: curator.firstName,
    lastName: curator.lastName,
    email: curator.email,
    phone: curator.phone,
    credentials: curator.credentials,
    profilePicture: curator.profilePicture ?? null,
    // Stored as "anonymous", shown to curators as "show my name", on by default.
    showAttribution: curator.anonymous !== true,
  }
}

/** The signed-in curator's own profile and attribution setting. */
export async function GET() {
  const curator = await getCurator()
  if (!curator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json({ profile: shape(curator) })
}

/** { firstName?, lastName?, showAttribution? } */
export async function PATCH(request: Request) {
  const curator = await getCurator()
  if (!curator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const data: { firstName?: string; lastName?: string; anonymous?: boolean } = {}

  if (body.firstName !== undefined || body.lastName !== undefined) {
    const firstName = body.firstName !== undefined ? tidy(body.firstName) : curator.firstName
    const lastName = body.lastName !== undefined ? tidy(body.lastName) : curator.lastName
    const errors = checkDetails({ firstName, lastName, phone: curator.phone })
    delete errors.phone
    if (Object.keys(errors).length) return NextResponse.json({ error: "Check your name.", fields: errors }, { status: 400 })
    Object.assign(data, { firstName, lastName })
  }
  if (typeof body.showAttribution === "boolean") data.anonymous = !body.showAttribution

  if (!Object.keys(data).length) return NextResponse.json({ error: "Nothing to change." }, { status: 400 })
  const updated = await prisma.curator.update({ where: { id: curator.id }, data })
  return NextResponse.json({ profile: shape(updated) })
}
