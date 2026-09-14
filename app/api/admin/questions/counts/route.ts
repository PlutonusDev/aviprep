import { NextResponse } from "next/server"
import { verifyAdmin } from "app/api/admin/middleware"
import { getQuestionCountsBySubject } from "@lib/question-counts"

/** Bank size per subject, split by authoring status. */
export async function GET() {
  const adminCheck = await verifyAdmin()
  if ("error" in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
  }

  const counts = await getQuestionCountsBySubject()
  return NextResponse.json({ counts })
}
