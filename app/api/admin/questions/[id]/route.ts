import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { verifyAdmin } from "app/api/admin/middleware"
import { validateQuestion, isValid } from "@lib/question-validation"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await verifyAdmin()
  if ("error" in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
  }

  const { id } = await params
  const body = await request.json()

  try {
    const errors = validateQuestion(body)
    if (!isValid(errors)) {
      return NextResponse.json(
        { error: "This question is not ready to save.", fieldErrors: errors },
        { status: 422 },
      )
    }

    const question = await prisma.question.update({
      where: { id },
      data: {
        subjectId: body.subjectId,
        topic: body.topic,
        difficulty: body.difficulty,
        questionText: body.questionText,
        options: body.options,
        correctIndex: body.correctIndex,
        explanation: body.explanation,
        // Previously omitted, so every edit silently wiped the citation.
        reference: body.reference || "",
        status: body.status || undefined,
        authorNote: body.authorNote ?? undefined,
        reviewedById: body.status === "published" ? adminCheck.userId : undefined,
      },
    })

    return NextResponse.json(question)
  } catch (error) {
    console.error("Failed to update question:", error)
    return NextResponse.json({ error: "Failed to update question" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await verifyAdmin()
  if ("error" in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
  }

  const { id } = await params

  try {
    await prisma.question.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete question:", error)
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 })
  }
}
