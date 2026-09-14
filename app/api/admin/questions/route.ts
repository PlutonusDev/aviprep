import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { verifyAdmin } from "app/api/admin/middleware"
import { validateQuestion, isValid } from "@lib/question-validation"

export async function GET(request: NextRequest) {
  const adminCheck = await verifyAdmin()
  if ("error" in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
  }

  const searchParams = request.nextUrl.searchParams
  const page = Number.parseInt(searchParams.get("page") || "1")
  // Cap it: the value comes straight from the query string.
  const pageSize = Math.min(200, Math.max(1, Number.parseInt(searchParams.get("pageSize") || "10") || 10))
  const search = searchParams.get("search") || ""
  const subjectId = searchParams.get("subjectId") || ""
  const topic = searchParams.get("topic") || ""
  const status = searchParams.get("status") || ""

  const where = {
    ...(search && {
      OR: [
        { questionText: { contains: search, mode: "insensitive" as const } },
        { topic: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(subjectId && subjectId !== "all" && { subjectId }),
    ...(topic && topic !== "all" && { topic }),
    // Rows written before the status field are live, so "published" must
    // include those with no status at all.
    ...(status &&
      status !== "all" && {
        ...(status === "published"
          ? { OR: [{ status: "published" }, { status: null }] }
          : { status }),
      }),
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

  return NextResponse.json({
    questions,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}

export async function POST(request: NextRequest) {
  const adminCheck = await verifyAdmin()
  if ("error" in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
  }

  const body = await request.json()

  try {
    const errors = validateQuestion(body)
    if (!isValid(errors)) {
      return NextResponse.json(
        { error: "This question is not ready to save.", fieldErrors: errors },
        { status: 422 },
      )
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
        status: body.status || "draft",
        authorId: adminCheck.userId ?? undefined,
        authorNote: body.authorNote || null,
      },
    })

    return NextResponse.json(question)
  } catch (error) {
    console.error("Failed to create question:", error)
    return NextResponse.json({ error: "Failed to create question" }, { status: 500 })
  }
}
