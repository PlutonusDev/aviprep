import fs from "node:fs/promises"
import { extractText } from "unpdf"
import { parseSchedule3, itemFullText } from "../lib/mos/schedule3-parser"

async function main() {
const buffer = await fs.readFile("scripts/doc/F2025C00050VOL03REC02.pdf")
const { text } = await extractText(new Uint8Array(buffer), { mergePages: false })
const parsed = parseSchedule3(text.join("\n"))

const elements = parsed.units.flatMap((u) => u.topics.flatMap((t) => t.subtopics.flatMap((s) => s.elements.map((e) => ({ u, e })))))
const items = elements.flatMap(({ u, e }) => e.items.map((it) => ({ u, e, it })))

console.log("units", parsed.units.length, "elements", elements.length, "items", items.length)

// Nothing may still be carrying a folded roman list.
const stillFolded = items.filter((x) => /\(\s*(?:i|ii|iii|iv|v|vi|vii|viii|ix|x)\s*\)/.test(x.it.text))
console.log("items still containing a folded roman:", stillFolded.length)
stillFolded.slice(0, 4).forEach((x) => console.log("   ", x.u.code, x.it.ref, JSON.stringify(x.it.text.slice(0, 110))))

// Refs must be unique inside an element.
let dupes = 0
for (const { e } of elements) {
  const seen = new Set<string>()
  for (const it of e.items) { if (seen.has(it.ref)) dupes++; seen.add(it.ref) }
}
console.log("duplicate refs:", dupes)

// Nothing empty.
console.log("items with no text at all:", items.filter((x) => !x.it.text && !x.it.ref.includes("(")).length, "(elements with no paragraphs — expected)")
console.log("sub-points missing their lead:", items.filter((x) => /\)\(/.test(x.it.ref) && !x.it.lead).length)

const cakc = parsed.units.find((u) => u.code === "CAKC")!
const el = cakc.topics.flatMap((t) => t.subtopics).flatMap((s) => s.elements).find((e) => e.number === "2.2.1")!
console.log("\nCAKC 2.2.1 —", el.items.length, "items")
for (const it of el.items.slice(0, 7)) console.log("  ", it.ref.padEnd(14), itemFullText(el, it))

// A lettered list that happens to reach (i) must not be mistaken for a roman.
const longLists = elements.filter(({ e }) => e.items.some((it) => it.ref.endsWith("(i)") && !it.ref.includes(")(")))
console.log("\nelements whose letters ran to (i):", longLists.length)
if (longLists.length) {
  const { u, e } = longLists[0]
  console.log("  ", u.code, e.number, "->", e.items.map((i) => i.ref.split("(").slice(1).join("(")).join(" ").slice(0, 120))
}
}
main()
