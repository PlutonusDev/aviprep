/**
 * Rebuilds lib/mos/data/schedule3.json from a PDF of Part 61 MOS Schedule 3.
 *
 *   npx tsx scripts/mos-build.ts ./scripts/doc/<schedule-3>.pdf
 *
 * Then open Admin → MOS coverage and press "Review changes". Nothing is written
 * until you apply the preview. Items are matched across compilations by their
 * wording (lib/mos/reconcile.ts), so renumbered and moved items keep their
 * links; links to reworded or removed items go to a review queue.
 */
import fs from "node:fs/promises"
import path from "node:path"
import { extractText } from "unpdf"
import { parseSchedule3 } from "../lib/mos/schedule3-parser"

async function main() {
  const file = process.argv[2]
  if (!file) {
    console.error("Usage: npx tsx scripts/mos-build.ts <schedule-3.pdf>")
    process.exit(1)
  }

  const buffer = await fs.readFile(file)
  const { text } = await extractText(new Uint8Array(buffer), { mergePages: false })
  const parsed = parseSchedule3(text.join("\n"))

  const items = parsed.units.reduce(
    (n, u) => n + u.topics.reduce((a, t) => a + t.subtopics.reduce((b, s) => b + s.elements.reduce((c, e) => c + e.items.length, 0), 0), 0),
    0,
  )
  if (!parsed.units.length || items < 100) {
    console.error(`Only found ${parsed.units.length} units and ${items} items. Is this Schedule 3?`)
    process.exit(1)
  }

  const out = {
    source: {
      instrument: "Part 61 Manual of Standards",
      schedule: "Schedule 3 – Aeronautical knowledge standards",
      compilation: parsed.compilation,
      registered: parsed.registered,
      file: path.basename(file),
      builtAt: new Date().toISOString(),
    },
    units: parsed.units,
  }

  const target = path.join(process.cwd(), "lib", "mos", "data", "schedule3.json")
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, JSON.stringify(out))
  console.log(`Wrote ${parsed.units.length} units and ${items} items (compilation ${parsed.compilation ?? "unknown"}) to ${target}`)
}

main()
