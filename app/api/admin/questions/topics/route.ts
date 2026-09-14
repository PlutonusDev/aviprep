import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { verifyAdmin } from "app/api/admin/middleware"
import { effectiveStatus } from "@lib/question-validation"

/**
 * Topic coverage for one subject: how many questions exist per topic and what
 * state they are in. This is what turns a flat bank into something an author
 * can plan against - you can see which topics are thin before writing.
 */
export async function GET(request: NextRequest) {
  const adminCheck = await verifyAdmin()
  if ("error" in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
  }

  const subjectId = request.nextUrl.searchParams.get("subjectId")
  if (!subjectId) {
    return NextResponse.json({ error: "subjectId is required" }, { status: 400 })
  }

  const rows = await prisma.question.findMany({
    where: { subjectId },
    select: { topic: true, status: true },
  })

  const byTopic = new Map<
    string,
    { topic: string; total: number; draft: number; review: number; published: number }
  >()

  for (const row of rows) {
    const topic = row.topic?.trim() || "Untitled topic"
    const entry =
      byTopic.get(topic) ?? { topic, total: 0, draft: 0, review: 0, published: 0 }
    entry.total += 1
    entry[effectiveStatus(row.status)] += 1
    byTopic.set(topic, entry)
  }

  const topics = Array.from(byTopic.values()).sort((a, b) => a.topic.localeCompare(b.topic))

  return NextResponse.json({
    topics,
    totals: {
      total: rows.length,
      draft: topics.reduce((n, t) => n + t.draft, 0),
      review: topics.reduce((n, t) => n + t.review, 0),
      published: topics.reduce((n, t) => n + t.published, 0),
    },
  })
}
