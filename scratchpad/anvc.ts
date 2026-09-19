import fs from "node:fs/promises"
import { extractText } from "unpdf"
import { parseSchedule3 } from "../lib/mos/schedule3-parser"
import old from "../lib/mos/data/schedule3.json"

async function main() {
const buffer = await fs.readFile("scripts/doc/F2025C00050VOL03REC02.pdf")
const { text } = await extractText(new Uint8Array(buffer), { mergePages: false })
const parsed = parseSchedule3(text.join("\n"))

const find = (units: any[]) => {
  const u = units.find((x: any) => x.code === "ANVC")
  return u.topics.flatMap((t: any) => t.subtopics).flatMap((s: any) => s.elements).find((e: any) => e.number === "2.9.6")
}
for (const [label, e] of [["BEFORE", find((old as any).units)], ["AFTER", find(parsed.units)]] as const) {
  console.log(`--- ${label}: ${e.text}`)
  for (const it of e.items) console.log("   ", it.ref.padEnd(16), JSON.stringify(it.text.slice(0, 80)), it.lead ? `| lead: ${JSON.stringify(it.lead.slice(0, 40))}` : "")
}
}
main()
