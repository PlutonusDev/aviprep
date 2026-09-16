import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { isResponse, requireStaff } from "@lib/staff"
import { validateQuestion, isValid } from "@lib/question-validation"
import { MOS_PUBLISH_ERROR, checkLinksForSubject, parseMosInput, saveMappings, withPrimaryMapping } from "@lib/mos/mappings"

export async function GET(request: NextRequest) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const searchParams = request.nextUrl.searchParams
  const page = Number.parseInt(searchParams.get("page") || "1")
  // Cap it: the value comes straight from the query string.
  const pageSize = Math.min(200, Math.max(1, Number.parseInt(searchParams.get("pageSize") || "10") || 10))
  const search = searchParams.get("search") || ""
  const subjectId = searchParams.get("subjectId") || ""
  const topic = searchParams.get("topic") || ""
  const status = searchParams.get("status") || ""
  const id = searchParams.get("id") || ""

  const where = {
    ...(/^[a-f0-9]{24}$/i.test(id) && { id }),
    ...(search && {
      OR: [
        { questionText: { contains: search, mode: "insensitive" as const } },
        { topic: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(subjectId && subjectId !== "all" && { subjectId }),
    ...(topic && topic !== "all" && { topic }),
    ...(status &&
      status !== "all" &&
      (status === "changes"
        ? // Live questions with a curator's edit waiting for review.
          { pendingRevisionAt: { not: null } }
        : status === "published"
          ? // Rows written before the status field are live.
            { AND: [{ OR: [{ status: "published" }, { status: null }] }] }
          : { status })),
  }

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      orderBy: { id: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.question.count({ where }),
  ])

  // Lets the list flag questions that still need a Part 61 MOS link.
  const mapped = await withPrimaryMapping("question", questions.map((q) => q.id))

  return NextResponse.json({
    questions: questions.map((q) => ({ ...q, mosMapped: mapped.has(q.id) })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    role: staff.role,
  })
}

export async function POST(request: NextRequest) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const body = await request.json()

  try {
    const errors = validateQuestion(body)
    if (!isValid(errors)) {
      return NextResponse.json({ error: "This question is not ready to save.", fieldErrors: errors }, { status: 422 })
    }

    // Curators can write and submit, never publish.
    const requested = body.status === "review" || body.status === "published" ? body.status : "draft"
    const status = !staff.isAdmin && requested === "published" ? "review" : requested

    const mos = parseMosInput(body.mos)
    const mosError = mos ? await checkLinksForSubject(mos, body.subjectId) : null
    if (mosError) return NextResponse.json({ error: mosError, fieldErrors: { mos: mosError } }, { status: 422 })
    if (status === "published" && !mos?.some((l) => l.primary)) {
      return NextResponse.json({ error: MOS_PUBLISH_ERROR, fieldErrors: { mos: MOS_PUBLISH_ERROR } }, { status: 422 })
    }

    const question = await prisma.question.create({
      data: {
        subjectId: body.subjectId,
        topic: body.topic,
        difficulty: body.difficulty,
        questionText: body.questionText,
        options: body.options,
        correctIndex: body.correctIndex,
        explanation: body.explanation,
        reference: body.reference || "",
        status,
        authorId: staff.userId,
        authorNote: body.authorNote || null,
        ...(status === "published" ? { reviewedById: staff.userId } : {}),
        ...(staff.isAdmin && (body.points === 1 || body.points === 3) ? { points: body.points } : {}),
      },
    })

    if (mos) {
      await saveMappings({ contentType: "question", contentId: question.id, subjectId: question.subjectId, links: mos, userId: staff.userId })
    }

    return NextResponse.json(question)
  } catch (error) {
    console.error("Failed to create question:", error)
    return NextResponse.json({ error: "Failed to create question" }, { status: 500 })
  }
}
