import { type NextRequest, NextResponse } from "next/server"
import { generateText, Output } from "ai"
import { z } from "zod"
import { verifyAdmin } from "app/api/admin/middleware"
import { SUBJECTS } from "@lib/products"
import { prisma } from "@lib/prisma"

const questionSchema = z.object({
  questions: z.array(
    z.object({
      questionText: z.string().describe("The question text"),
      options: z.array(z.string()).length(4).describe("Four answer options"),
      correctIndex: z.number().min(0).max(3).describe("Index of the correct answer (0-3)"),
      explanation: z.string().describe("Explanation of why the correct answer is correct"),
      reference: z.string().describe("CASR Part 61 reference, eg: CASA Part 61 MOS - Unit 1.8.2 Section 2.1.3(b)")
    }),
  ),
})

export async function POST(request: NextRequest) {
  const adminCheck = await verifyAdmin()
  if ("error" in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
  }

  const { subjectId, topic, difficulty, count, additionalContext } = await request.json()

  const subject = SUBJECTS.find((s) => s.id === subjectId)
  if (!subject) {
    return NextResponse.json({ error: "Invalid subject" }, { status: 400 })
  }

  const existingQuestions = await prisma.question.findMany({
    where: { subjectId, topic: { contains: topic, mode: "insensitive" } },
    take: 10,
    select: { questionText: true, options: true, explanation: true },
  })

  const ragContext =
    existingQuestions.length > 0
      ? `\n\nHere are some existing questions on similar topics for reference style and difficulty:\n${existingQuestions
          .map(
            (q, i) => `${i + 1}. ${q.questionText}\nOptions: ${q.options.join(" | ")}\nExplanation: ${q.explanation}`,
          )
          .join("\n\n")}`
      : ""

  try {
    const { output } = await generateText({
      model: "openai/gpt-4o",
      // @ts-expect-error: Complex Zod/Prisma type recursion is too deep for TS to resolve
      output: Output.object({
        schema: questionSchema,
      }),
      prompt: `You are an expert aviation examiner creating practice questions for the Australian CASA Commercial Pilot License (CPL) theory exam.

Subject: ${subject.name} (${subject.code})
Topic: ${topic}
Difficulty: ${difficulty}
Number of questions to generate: ${count}

Requirements:
- Questions must be accurate and aligned with CASA CPL syllabus
- Each question must have exactly 4 options
- There must be only one indisputably correct answer.
- Distractors must be plausible but technically incorrect based on the MOS.
- Explanations should be educational and reference relevant aviation principles
- ${difficulty === "easy" ? "Questions should test basic recall and understanding" : ""}
- ${difficulty === "medium" ? "Questions should require application of concepts" : ""}
- ${difficulty === "hard" ? "Questions should involve complex scenarios and multi-step reasoning" : ""}
${additionalContext ? `\nAdditional context from admin: ${additionalContext}` : ""}
${ragContext}

Generate ${count} unique, high-quality exam questions.`,
    })

    // @ts-expect-error: TODO
    const questionsWithMetadata = output.questions.map((q) => ({
      ...q,
      subjectId,
      topic,
      difficulty,
    }))

    return NextResponse.json({ questions: questionsWithMetadata })
  } catch (error) {
    console.error("Failed to generate questions:", error)
    return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 })
  }
}