import { NextResponse } from "next/server"
import { isResponse, requireStaff } from "@lib/staff"
import { reviewQueue } from "@lib/review/review"

/** Everything waiting for an admin, longest-waiting first. */
export async function GET() {
  const staff = await requireStaff()
  if (isResponse(staff)) return staff

  try {
    return NextResponse.json({ items: await reviewQueue() })
  } catch (error) {
    console.error("Review queue error:", error)
    return NextResponse.json({ error: "Couldn't load the review queue." }, { status: 500 })
  }
}
