import { NextResponse } from "next/server"
import { generateText, Output, embed } from "ai"
import { z } from "zod"
import { verifyAdmin } from "app/api/admin/middleware"
import { SUBJECTS } from "@lib/subjects"
import { MongoClient } from "mongodb"

// Schema for text content
const textContentSchema = z.object({
    html: z.string().describe("HTML content for the lesson, including headings, paragraphs, lists, and formatting. Keep the entire HTML output on one line, do not use linebreaks or empty lines."),
})

// Schema for quiz questions
const quizContentSchema = z.object({
    questions: z.array(
        z.object({
            id: z.string(),
            text: z.string().describe("The question text"),
            options: z.array(z.string()).length(4).describe("Four answer options"),
            correctIndex: z.number().min(0).max(3).describe("Index of the correct answer (0-3)"),
            explanation: z.string().describe("Explanation of why the correct answer is correct"),
        })
    ),
})

// Schema for flashcards
const flashcardsContentSchema = z.object({
    cards: z.array(
        z.object({
            id: z.string(),
            front: z.string().describe("Front of the card - question or term"),
            back: z.string().describe("Back of the card - answer or definition"),
        })
    ),
})

// Schema for exercise steps
const exerciseStepsSchema = z.object({
    type: z.literal("steps"),
    steps: z.array(
        z.object({
            id: z.string(),
            title: z.string(),
            content: z.string(),
        })
    ),
})

// Schema for matching exercise
const exerciseMatchingSchema = z.object({
    type: z.literal("matching"),
    pairs: z.array(
        z.object({
            id: z.string(),
            term: z.string(),
            definition: z.string(),
        })
    ),
})

// Schema for ordering exercise
const exerciseOrderingSchema = z.object({
    type: z.literal("ordering"),
    items: z.array(
        z.object({
            id: z.string(),
            text: z.string(),
            order: z.number(),
        })
    ),
})

export async function POST(request: Request): Promise<Response> {
    const adminCheck = await verifyAdmin()
    if ("error" in adminCheck) {
        return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
    }

    try {
        const { contentType, subjectId, topic, lessonTitle, additionalContext, exerciseType } = await request.json()

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


        const subject = SUBJECTS.find((s) => s.id === subjectId)
        const subjectName = subject?.name || "General Aviation"
        const subjectCode = subject?.code || ""

        const basePrompt = `You are an expert aviation instructor creating educational content for the Australian CASA Commercial Pilot License (CPL) theory course.

Subject: ${subjectName}${subjectCode ? ` (${subjectCode})` : ""}
Topic: ${topic || lessonTitle}
Lesson Title: ${lessonTitle}
${additionalContext ? `\nAdditional context: ${additionalContext}` : ""}

Requirements:
- Content must be accurate and aligned with CASA CPL syllabus
- Use Australian aviation terminology and regulations
- Be educational, clear, and engaging
- Suitable for student pilots preparing for CPL theory exams`

        switch (contentType) {
            case "text": {
                const result: any = await generateText({
                    model: "openai/gpt-4o",
                    output: Output.object({ schema: textContentSchema as any }),
                    prompt: `${basePrompt}

Generate comprehensive lesson content in HTML format. Include:
- A clear introduction to the topic
- Well-structured sections with headings (h2, h3)
- Key concepts explained in detail
- Important points highlighted
- Practical examples where relevant
- Summary or key takeaways at the end

The HTML should use semantic tags like <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em> and be returned minified on one single line.
Do NOT include <html>, <head>, <body> tags - just the content.`,
                    maxOutputTokens: 4000,
                })

                return NextResponse.json({ content: result.output })
            }

            case "quiz": {
                const result: any = await generateText({
                    model: "openai/gpt-4o",
                    output: Output.object({ schema: quizContentSchema as any }),
                    prompt: `${basePrompt}

Generate 5-8 multiple choice quiz questions to test understanding of this topic.
Each question should:
- Have exactly 4 answer options (A, B, C, D)
- Have only one correct answer
- Include a detailed explanation of why the correct answer is right
- Test different aspects of the topic (recall, understanding, application)
- Progress from easier to more challenging questions

Generate unique IDs for each question using timestamps (e.g., "q_1", "q_2", etc.).`,
                    maxOutputTokens: 4000,
                })

                return NextResponse.json({ content: result.output })
            }

            case "flashcards": {
                const result: any = await generateText({
                    model: "openai/gpt-4o",
                    output: Output.object({ schema: flashcardsContentSchema as any }),
                    prompt: `${basePrompt}

Generate 10-15 flashcards for studying this topic.
Each card should have:
- Front: A question, term, or concept to test
- Back: The answer, definition, or explanation

Cover key terminology, important facts, formulas, procedures, and concepts.
Generate unique IDs for each card using timestamps (e.g., "card_1", "card_2", etc.).`,
                    maxOutputTokens: 3000,
                })

                return NextResponse.json({ content: result.output })
            }

            case "exercise": {
                if (exerciseType === "matching") {
                    const result: any = await generateText({
                        model: "openai/gpt-4o",
                        output: Output.object({ schema: exerciseMatchingSchema as any }),
                        prompt: `${basePrompt}

Generate a matching exercise with 6-8 pairs.
Each pair should have:
- A term or concept
- Its corresponding definition or explanation

These should test the student's understanding of key terminology and concepts related to the topic.
Generate unique IDs for each pair (e.g., "pair_1", "pair_2", etc.).`,
                        maxOutputTokens: 2000,
                    })

                    return NextResponse.json({ content: result.output })
                } else if (exerciseType === "ordering") {
                    const result: any = await generateText({
                        model: "openai/gpt-4o",
                        output: Output.object({ schema: exerciseOrderingSchema as any }),
                        prompt: `${basePrompt}

Generate an ordering exercise with 5-8 steps/items.
This should be a procedure, process, or sequence related to the topic that students need to put in the correct order.
Each item should have text describing one step and its correct order number (starting from 1).
Generate unique IDs for each item (e.g., "item_1", "item_2", etc.).`,
                        maxOutputTokens: 2000,
                    })

                    return NextResponse.json({ content: result.output })
                } else {
                    // Default to steps
                    const result: any = await generateText({
                        model: "openai/gpt-4o",
                        output: Output.object({ schema: exerciseStepsSchema as any }),
                        prompt: `${basePrompt}

Generate a step-by-step guide or procedure exercise with 5-8 steps.
Each step should have:
- A title (short, action-oriented)
- Content (detailed explanation of what to do and why)

This could be a procedure, checklist, or systematic approach related to the topic.
Generate unique IDs for each step (e.g., "step_1", "step_2", etc.).`,
                        maxOutputTokens: 3000,
                    })

                    return NextResponse.json({ content: result.output })
                }
            }

            default:
                return NextResponse.json({ error: "Invalid content type" }, { status: 400 })
        }
    } catch (error) {
        console.error("Failed to generate content:", error)
        return NextResponse.json(
            { error: "Failed to generate content. Please try again." },
            { status: 500 }
        )
    }
}
