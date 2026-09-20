/**
 * Rebuilds lib/review/data/rubric.json: the two documents AviPrep Intelligence
 * measures a submitted question against.
 *
 *   npx tsx scripts/build-review-rubric.ts
 *
 *   docs/other/14_aih_appendix_b.pdf                 FAA Aviation Instructor's
 *                                                    Handbook (FAA-H-8083-9),
 *                                                    Appendix B
 *   docs/contractors/source/content-guidelines.html  Writing for AviPrep, the
 *                                                    guide curators are given
 *
 * Re-run it whenever either document changes. The text is baked into the repo
 * so nothing parses a PDF while a curator is waiting on a response.
 */
import fs from "node:fs/promises"
import path from "node:path"
import { extractText } from "unpdf"

const tidy = (text: string) =>
  text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

async function fromPdf(file: string) {
  const buffer = await fs.readFile(file)
  const { text } = await extractText(new Uint8Array(buffer), { mergePages: true })
  // The bullet glyph survives extraction as U+2981; the model reads "-" better.
  return tidy(text.replace(/⦁/g, "\n- "))
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  deg: "°",
  times: "×",
}

async function fromHtml(file: string) {
  const html = await fs.readFile(file, "utf8")
  const text = html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, "")
    // Block ends become line breaks, so headings and list items stay apart.
    .replace(/<\/(p|h[1-6]|li|div|section|tr|td|th|table|ul|ol|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&([a-z]+);/gi, (whole, name) => ENTITIES[name.toLowerCase()] ?? whole)
  return tidy(text)
}

async function main() {
  const root = process.cwd()
  const sources = {
    handbook: {
      file: "docs/other/14_aih_appendix_b.pdf",
      title: "FAA Aviation Instructor's Handbook (FAA-H-8083-9), Appendix B - Developing a Test Item Bank",
    },
    guidelines: {
      file: "docs/contractors/source/content-guidelines.html",
      title: "Writing for AviPrep - the curator content guidelines",
    },
  }

  const handbook = await fromPdf(path.join(root, sources.handbook.file))
  const guidelines = await fromHtml(path.join(root, sources.guidelines.file))

  for (const [name, text] of Object.entries({ handbook, guidelines })) {
    if (text.length < 2000) {
      console.error(`The ${name} came out at ${text.length} characters. That isn't the whole document.`)
      process.exit(1)
    }
  }

  const out = {
    builtAt: new Date().toISOString(),
    handbook: { ...sources.handbook, text: handbook },
    guidelines: { ...sources.guidelines, text: guidelines },
  }

  const target = path.join(root, "lib", "review", "data", "rubric.json")
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, JSON.stringify(out, null, 1))
  console.log(`Wrote ${handbook.length} characters of handbook and ${guidelines.length} of guidelines to ${target}`)
}

main()
