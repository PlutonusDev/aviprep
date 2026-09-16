import { NextResponse } from "next/server"
import { isResponse, requireStaff } from "@lib/staff"
import { coverageDetail } from "@lib/mos/coverage"
import { getLibraryStatus } from "@lib/mos/library"

export const dynamic = "force-dynamic"

export async function GET(_request: Request, { params }: { params: Promise<{ subjectId: string }> }) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff
  const { subjectId } = await params
  try {
    const [detail, library] = await Promise.all([coverageDetail(subjectId), getLibraryStatus()])
    if (!detail) return NextResponse.json({ error: "This subject has no Schedule 3 units." }, { status: 404 })
    return NextResponse.json({ ...detail, library, role: staff.role })
  } catch (error) {
    console.error("MOS coverage detail failed:", error)
    return NextResponse.json({ error: "Couldn't work out coverage." }, { status: 500 })
  }
}
