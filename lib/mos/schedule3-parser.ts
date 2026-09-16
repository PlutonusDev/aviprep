/**
 * Turns the text of CASA's Part 61 MOS Schedule 3 (aeronautical knowledge
 * standards) into a hierarchy:
 *
 *   Unit (e.g. 1.3.2 CADA)
 *     Topic       2. Aerodynamics
 *       Sub-topic 2.1 Changes in angle of attack
 *         Element 2.1.1 Explain the effect of changes in angle of attack...
 *           Item  (a) pressure changes above and below an aerofoil
 *
 * Items are what content maps to and what coverage counts. An element with
 * lettered paragraphs contributes one item per paragraph; an element without
 * them is an item on its own. Deeper levels - (i), (A) and notes - are folded
 * into the text of the item above, because nobody writes a question for
 * "(iv) ammeter" in isolation from its stem.
 *
 * Pure and dependency-free: the build script feeds it text pulled from the PDF,
 * and it can be re-run against any future compilation of the Schedule.
 */

export type MosLicence = "rpl" | "ppl" | "cpl" | "atpl" | "irex" | "fe" | "rating"

export interface ParsedItem {
  /** "2.1.1(a)", or "2.1.1" for an element without paragraphs. */
  ref: string
  /** The item's own words, with deeper sub-points folded in. */
  text: string
}

export interface ParsedElement {
  number: string
  text: string
  items: ParsedItem[]
}

export interface ParsedSubtopic {
  number: string
  title: string
  elements: ParsedElement[]
}

export interface ParsedTopic {
  number: string
  title: string
  subtopics: ParsedSubtopic[]
}

export interface ParsedUnit {
  number: string
  code: string
  title: string
  section: string
  licence: MosLicence
  reserved: boolean
  topics: ParsedTopic[]
}

export interface ParsedSchedule {
  compilation: string | null
  registered: string | null
  units: ParsedUnit[]
}

const HEADER = /^Schedule 3 Part 61 Manual of Standards Aeronautical knowledge standards$/
const PAGE = /^Page \d+ of \d+ pages$/
// Older compilations: "Authorised Version F2021C00449 registered 20/05/2021".
// Newer (and rectified) ones: "Rectified Authorised Version registered 19/08/2026 F2025C00050".
const FOOTER = /(?:Rectified\s+)?Authorised Version\s+(?:([A-Z]\d{4}C\d{5})\s+registered\s+(\d{2}\/\d{2}\/\d{4})|registered\s+(\d{2}\/\d{2}\/\d{4})\s+([A-Z]\d{4}C\d{5}))\s*$/
const TOC_LEADER = /\.{4,}\s*[\d, ]+$/

// F2025C00050 writes some as "AGKA : ATPL ...", with a space before the colon.
const UNIT = /^Unit (\d+\.\d+\.\d+) ([A-Z]{4,5})\s*:\s*(.*)$/
const SECTION = /^Section (\d+\.\d+) (.+)$/i
const TOPIC = /^(\d+)\.\s+(.+)$/
const SUBTOPIC = /^(\d+)\.(\d+)\s+(.+)$/
const ELEMENT = /^(\d+)\.(\d+)\.(\d+)\s+(.+)$/
const PARA = /^\(([a-z]{1,2}|[ivx]{1,5}|[A-Z])\)\s*(.*)$/

const ROMANS = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii", "xiii", "xiv", "xv", "xvi", "xvii", "xviii", "xix", "xx"]

function nextLetter(letter: string | null) {
  if (!letter) return "a"
  return String.fromCharCode(letter.charCodeAt(letter.length - 1) + 1)
}

export function licenceFor(unitNumber: string, code: string): MosLicence {
  const appendix = unitNumber.split(".")[0]
  if (appendix === "2") return code === "IREX" ? "irex" : "rating"
  if (appendix !== "1") return "rating"
  if (code === "BAKC" || code.startsWith("R")) return "rpl"
  if (code === "GNSSC" || code.startsWith("P")) return "ppl"
  if (code.startsWith("C")) return "cpl"
  if (code.startsWith("A")) return "atpl"
  if (code.startsWith("F")) return "fe"
  return "rating"
}

const isReserved = (text: string) => /(^|–|-|\s)Reserved\.?$/i.test(text.trim())

const tidy = (text: string) =>
  text
    .replace(/\s+/g, " ")
    .replace(/\s+([,;:.])/g, "$1")
    .trim()

export function parseSchedule3(raw: string): ParsedSchedule {
  let compilation: string | null = null
  let registered: string | null = null

  // Clean lines: drop running headers, split footers glued onto the last line of a page.
  const lines: string[] = []
  for (const rawLine of raw.split(/\r?\n/)) {
    let line = rawLine.trim()
    if (!line || line.startsWith("=====PAGE") || HEADER.test(line) || PAGE.test(line)) continue
    const footer = line.match(FOOTER)
    if (footer) {
      compilation ??= footer[1] ?? footer[4]
      registered ??= footer[2] ?? footer[3]
      line = line.replace(FOOTER, "").trim()
      if (!line) continue
    }
    lines.push(line)
  }

  const units: ParsedUnit[] = []
  let section = ""
  let unit: ParsedUnit | null = null
  let topic: ParsedTopic | null = null
  let subtopic: ParsedSubtopic | null = null
  let element: ParsedElement | null = null
  /** Where continuation lines go. */
  let target: { text: string } | null = null
  let unitTitleOpen = false
  let lastLetter: string | null = null
  let lastRoman: string | null = null
  let inRoman = false

  // Paragraph tokens for look-ahead when "(i)" could be a letter or a numeral.
  const paraToken = (i: number) => {
    for (let j = i + 1; j < Math.min(lines.length, i + 6); j++) {
      const m = lines[j].match(PARA)
      if (m) return m[1]
    }
    return null
  }

  const closeElement = () => {
    element = null
    target = null
    lastLetter = null
    lastRoman = null
    inRoman = false
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // The table of contents and code index come first; their lines end in page numbers.
    if (TOC_LEADER.test(line)) continue

    const unitMatch = line.match(UNIT)
    if (unitMatch) {
      closeElement()
      const [, number, code, title] = unitMatch
      unit = { number, code, title: title.trim(), section, licence: licenceFor(number, code), reserved: false, topics: [] }
      units.push(unit)
      topic = null
      subtopic = null
      unitTitleOpen = true
      continue
    }

    const sectionMatch = line.match(SECTION)
    if (sectionMatch && !/^\d/.test(line)) {
      section = `${sectionMatch[1]} ${sectionMatch[2].replace(/\b([A-Z])([A-Z]{4,})\b/g, (_: string, a: string, b: string) => a + b.toLowerCase())}`.trim()
      unitTitleOpen = false
      continue
    }
    if (/^Appendix \d+\./i.test(line)) continue
    // "1 Reserved" without the full stop, which the topic pattern would miss.
    if (/^\d+\s+Reserved\.?$/i.test(line)) continue
    if (!unit) continue

    const elementMatch = line.match(ELEMENT)
    const subtopicMatch = !elementMatch && line.match(SUBTOPIC)
    const topicMatch = !elementMatch && !subtopicMatch && line.match(TOPIC)

    // Element: must belong to the current topic, otherwise it's wrapped text like "2.1.3 m".
    if (elementMatch && topic && elementMatch[1] === topic.number) {
      unitTitleOpen = false
      closeElement()
      const [, t, s, e, text] = elementMatch
      const subNumber = `${t}.${s}`
      if (!subtopic || subtopic.number !== subNumber) {
        subtopic = { number: subNumber, title: "", elements: [] }
        topic.subtopics.push(subtopic)
      }
      const el: ParsedElement = { number: `${t}.${s}.${e}`, text: tidy(text), items: [] }
      subtopic.elements.push(el)
      element = el
      target = el
      continue
    }

    if (subtopicMatch && topic && subtopicMatch[1] === topic.number) {
      const n = Number(subtopicMatch[2])
      const prev = subtopic ? Number(subtopic.number.split(".")[1]) : 0
      if (n > prev && n <= prev + 3) {
        unitTitleOpen = false
        closeElement()
        subtopic = { number: `${subtopicMatch[1]}.${subtopicMatch[2]}`, title: tidy(subtopicMatch[3]), elements: [] }
        topic.subtopics.push(subtopic)
        continue
      }
    }

    if (topicMatch) {
      const n = Number(topicMatch[1])
      const prev = topic ? Number(topic.number) : 0
      if (n > prev && n <= prev + 3) {
        unitTitleOpen = false
        closeElement()
        topic = { number: String(n), title: tidy(topicMatch[2]), subtopics: [] }
        unit.topics.push(topic)
        subtopic = null
        continue
      }
    }

    const paraMatch = element ? line.match(PARA) : null
    // A stem that wraps onto a line starting "(b) above..." is text, not a paragraph.
    const wrappedStem =
      !!paraMatch && !!element && !(element as ParsedElement).items.length && paraMatch[1] !== "a" && paraMatch[1] !== "i" && !/[:;.]$/.test((element as ParsedElement).text)
    if (paraMatch && element && !wrappedStem) {
      let [, token, text] = paraMatch
      const expectedLetter = nextLetter(lastLetter)
      const expectedRoman = ROMANS[lastRoman ? ROMANS.indexOf(lastRoman) + 1 : 0]
      const isRomanToken = ROMANS.includes(token)
      const isCapital = /^[A-Z]$/.test(token)

      let kind: "letter" | "roman" | "capital"
      if (isCapital) kind = "capital"
      else if (isRomanToken && token === expectedRoman && (inRoman || token !== expectedLetter || paraToken(i) === "ii")) kind = "roman"
      else if (isRomanToken && inRoman && token === lastRoman) kind = "roman" // CASA's own duplicate numbering
      else if (/^[a-z]{1,2}$/.test(token) && (token === expectedLetter || !lastLetter || token > (lastLetter ?? ""))) kind = "letter"
      else kind = isRomanToken ? "roman" : "letter"

      const current = element as ParsedElement
      if (kind === "letter") {
        // CASA occasionally re-uses a letter (ANVC 2.9.6 has "(a)" after "(b)"); refs must stay unique.
        if (current.items.some((it) => it.ref === `${current.number}(${token})`)) token = expectedLetter
        const item: ParsedItem = { ref: `${current.number}(${token})`, text: tidy(text) }
        current.items.push(item)
        lastLetter = token
        lastRoman = null
        inRoman = false
        target = item
      } else {
        const host = current.items[current.items.length - 1] ?? current
        host.text = `${host.text} (${token}) ${tidy(text)}`
        if (kind === "roman") {
          lastRoman = token
          inRoman = true
        }
        target = host
      }
      continue
    }

    // Continuation of whatever came last.
    if (unitTitleOpen && !topic) {
      unit.title = tidy(`${unit.title} ${line}`)
      continue
    }
    if (target) target.text = tidy(`${target.text} ${line}`)
    else if (subtopic && !subtopic.elements.length) subtopic.title = tidy(`${subtopic.title} ${line}`)
  }

  // Finalise: reserved flags, elements without paragraphs become items, drop reserved leaves.
  for (const u of units) {
    u.reserved = isReserved(u.title)
    u.title = u.title.replace(/\s*[–-]\s*Reserved\.?$/i, "").trim()
    for (const t of u.topics) {
      for (const s of t.subtopics) {
        s.elements = s.elements.filter((e) => !isReserved(e.text))
        for (const e of s.elements) {
          e.items = e.items.filter((it) => !isReserved(it.text))
          if (!e.items.length) e.items = [{ ref: e.number, text: "" }]
        }
      }
      t.subtopics = t.subtopics.filter((s) => s.elements.length && !isReserved(s.title))
    }
    u.topics = u.topics.filter((t) => t.subtopics.length && !isReserved(t.title))
    if (!u.topics.length) u.reserved = true
  }

  return { compilation, registered, units }
}

/** Full, self-contained wording of an item: the element's stem plus the paragraph. */
export function itemFullText(element: Pick<ParsedElement, "text">, item: ParsedItem) {
  if (!item.text) return element.text
  const stem = element.text.replace(/[:;,]\s*$/, "")
  return `${stem}: ${item.text.replace(/[;.]\s*(and|or)?\s*$/i, "")}`
}
