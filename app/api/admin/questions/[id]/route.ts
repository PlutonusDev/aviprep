import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { verifyAdmin } from "app/api/admin/middleware"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await verifyAdmin()
  if ("error" in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
  }

  const { id } = await params
  const body = await request.json()

  try {
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
