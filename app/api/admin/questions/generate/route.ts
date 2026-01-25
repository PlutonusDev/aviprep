import { type NextRequest, NextResponse } from "next/server"
import { generateText, Output, embed } from "ai"
import { z } from "zod"
import { verifyAdmin } from "app/api/admin/middleware"
import { SUBJECTS } from "@lib/products"
import { prisma } from "@lib/prisma"
import { MongoClient } from "mongodb"

const questionSchema = z.object({
  questions: z.array(
    z.object({
      questionText: z.string().describe("The question text"),
      options: z.array(z.string()).length(4).describe("Four answer options"),
      correctIndex: z.number().min(0).max(3).describe("Index of the correct answer (0-3)"),
      explanation: z.string().describe("Explanation of why the correct answer is correct, don't include the reference here"),
      reference: z.string().describe("The reference to the Manual of Standards document, returned as 'Part 61 MOS - Unit X.X Section X.X.X'")
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
    const client = new MongoClient(process.env.DATABASE_URL!)
    const db = client.db('vectors')
    const collection = db.collection('part61-mos')

    const { embedding } = await embed({
      model: 'openai/text-embedding-3-small',
      value: topic,
    });

    const mosResults = await collection.aggregate([
      {
        $vectorSearch: {
          index: "part61_mos_index",
          path: "embedding",
          queryVector: embedding,
          numCandidates: 100,
          limit: 8
        }
      },
      {
        $project: { _id: 0, text: 1, metadata: 1 }
      }
    ]).toArray();

    const mosContext = mosResults.length > 0
  ? `\n\nSOURCE MATERIAL FROM CASR PART 61 MOS:\n${mosResults
      .map(r => `---
MOS_REFERENCE: CASA Part 61 MOS - Unit ${r.metadata.unit} Section ${r.metadata.section}
CONTENT: ${r.text}
---`)
      .join("\n\n")}`
  : "";

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

${mosContext}

${ragContext}

Instructions for References:
- Use the [REF] tags provided in the context above to populate the "reference" field.
- Ensure the "explanation" reflects the specific technical wording in the MOS excerpts provided.

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