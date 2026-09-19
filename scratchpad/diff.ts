import fs from "node:fs/promises"
import { extractText } from "unpdf"
import { parseSchedule3, itemFullText } from "../lib/mos/schedule3-parser"
import old from "../lib/mos/data/schedule3.json"

async function main() {
const buffer = await fs.readFile("scripts/doc/F2025C00050VOL03REC02.pdf")
const { text } = await extractText(new Uint8Array(buffer), { mergePages: false })
const parsed = parseSchedule3(text.join("\n"))

type Row = { key: string; full: string }
const flatten = (units: any[]): Row[] =>
  units.flatMap((u: any) => u.topics.flatMap((t: any) => t.subtopics.flatMap((s: any) =>
    s.elements.flatMap((e: any) => e.items.map((it: any) => ({ key: `${u.code} ${it.ref}`, full: itemFullText(e, it) }))))))

const before = new Map(flatten((old as any).units).map((r) => [r.key, r.full]))
const after = new Map(flatten(parsed.units).map((r) => [r.key, r.full]))

const kept = [...after.keys()].filter((k) => before.has(k))
const added = [...after.keys()].filter((k) => !before.has(k))
const gone = [...before.keys()].filter((k) => !after.has(k))
const reworded = kept.filter((k) => before.get(k) !== after.get(k))

console.log("before", before.size, "after", after.size)
console.log("kept (same ref):", kept.length, "of which reworded:", reworded.length)
console.log("new refs:", added.length)
console.log("refs that disappeared:", gone.length)

console.log("\nA sample of the refs that disappeared (paragraphs demoted to lead-ins):")
gone.slice(0, 5).forEach((k) => console.log("  ", k, "—", before.get(k)!.slice(0, 90) + "…"))

if (reworded.length) {
  console.log("\nUNEXPECTED rewording of a kept ref:")
  reworded.slice(0, 5).forEach((k) => {
    console.log("  ", k)
    console.log("     was:", before.get(k))
    console.log("     now:", after.get(k))
  })
} else {
  console.log("\nNo kept ref changed wording — existing links to unsplit items are untouched.")
}
}
main()
