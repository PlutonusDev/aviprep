import { NextResponse } from "next/server"
import { isResponse, requireStaff } from "@lib/staff"
import { coverageOverview } from "@lib/mos/coverage"
import { getLibraryStatus } from "@lib/mos/library"

export const dynamic = "force-dynamic"

export async function GET() {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff
  try {
    const [subjects, library] = await Promise.all([coverageOverview(), getLibraryStatus()])
    return NextResponse.json({ subjects, library, role: staff.role })
  } catch (error) {
    console.error("MOS coverage failed:", error)
    return NextResponse.json({ error: "Couldn't work out coverage." }, { status: 500 })
  }
}
