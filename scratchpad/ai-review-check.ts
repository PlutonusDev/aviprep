/**
 * Checks AviPrep Intelligence without touching the database:
 *   npx tsx --env-file=.env scratchpad/ai-review-check.ts
 * The first half is pure. The second makes real model calls.
 */
import { generateText, Output } from "ai"
import { MODEL, SYSTEM, buildPrompt, tidyComment, verdictSchema, type MosForReview, type QuestionForReview } from "../lib/review/ai-rubric"

let failures = 0
const check = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) failures++
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `\n     got  ${JSON.stringify(got)}\n     want ${JSON.stringify(want)}`}`)
}

/* --- tidyComment ----------------------------------------------------------- */
check("keeps one sentence", tidyComment("Reads well and the key is sound."), "Reads well and the key is sound.")
check("keeps two", tidyComment("A. B."), "A. B.")
check("drops the third", tidyComment("One. Two. Three."), "One. Two.")
check("collapses whitespace", tidyComment("  a\n\n  b.  "), "a b.")
check("survives no full stop", tidyComment("no full stop here"), "no full stop here")
check("handles a question mark", tidyComment("Is the key right? Check it. And this."), "Is the key right? Check it.")
check("empty stays empty", tidyComment("   "), "")
const long = tidyComment(`${"word ".repeat(200)}end.`)
check("capped at 400", long.length <= 400, true)
check("ellipsis on the cap", long.endsWith("…"), true)
check("decimals don't split it", tidyComment("Use 1.013 hPa as the datum."), "Use 1.013 hPa as the datum.")

/* --- buildPrompt ----------------------------------------------------------- */
const choice: QuestionForReview = {
  subjectId: "cmet",
  topic: "Density altitude",
  difficulty: "medium",
  questionText: "An aerodrome at 2,000 ft AMSL has a QNH of 1013 hPa and an OAT of 35 degrees C. Compared with a standard day, take-off distance will be",
  options: ["longer, because density altitude is higher", "shorter, because density altitude is lower", "longer, because pressure altitude is higher", "unchanged, because QNH is standard"],
  correctIndex: 0,
  explanation: "At 35 degrees C the air is well above ISA for 2,000 ft, so density altitude is higher and the aircraft performs as though it were at a greater elevation.",
  reference: "Part 61 MOS Schedule 3",
}
const mos: MosForReview[] = [{ ref: "CMET 2.3.1(a)", primary: true, text: "Explain the effect of air density on aeroplane take-off performance: temperature" }]
const prompt = buildPrompt(choice, mos)
check("marks the key", prompt.includes("1. longer, because density altitude is higher   <- keyed as correct"), true)
check("lists the MOS item", prompt.includes("CMET 2.3.1(a) (primary)"), true)
check("no image line when there is no image", prompt.includes("Image:"), false)

const numeric: QuestionForReview = {
  ...choice,
  answerType: "numeric",
  options: [],
  correctIndex: null,
  answerValue: 3200,
  answerUnit: "ft",
  tolerance: 5,
  toleranceType: "percent",
  imageUrl: "/uploads/x.png",
  imageAlt: null,
}
const numericPrompt = buildPrompt(numeric, [])
check("states the tolerance", numericPrompt.includes("a typed value of 3200 ft, accepted within 5%"), true)
check("flags a missing alt", numericPrompt.includes("is missing"), true)
check("says when nothing is linked", numericPrompt.includes("  none"), true)

console.log(`\n${failures ? `${failures} FAILED` : "pure checks all pass"}\n`)

/* --- The model ------------------------------------------------------------- */
async function judge(label: string, question: QuestionForReview, links: MosForReview[]) {
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: verdictSchema }),
    system: SYSTEM,
    prompt: buildPrompt(question, links),
  })
  console.log(`--- ${label}\n    writing=${output.writing} mapping=${output.mapping}\n    ${tidyComment(output.comment)}\n`)
}

async function main() {
  console.log(`model: ${MODEL}, system prompt ${SYSTEM.length} chars\n`)

  // 1. The guidelines' own "Better" example. Should pass.
  await judge("good question", choice, mos)

  // 2. The guidelines' own "Needs work" example: double negative, giveaway
  //    length, a letter reference that breaks when options shuffle.
  await judge(
    "bad question",
    {
      ...choice,
      questionText: "Which of the following is not something that doesn't affect density altitude?",
      options: ["Temperature", "Humidity", "Pressure, temperature and humidity all affect density altitude", "Both A and B"],
      correctIndex: 2,
      explanation: "All three affect density altitude.",
    },
    mos,
  )

  // 3. Well written, but linked to an item whose verb it doesn't test.
  await judge("good writing, doubtful mapping", choice, [
    { ref: "CMET 4.1.2(c)", primary: true, text: "Describe the formation of radiation fog and the conditions that favour it" },
  ])
}

if (process.argv.includes("--model")) main()
else console.log("(pass --model to make real model calls)")
