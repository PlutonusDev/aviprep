# -*- coding: utf-8 -*-
"""Roman sub-points become items of their own, instead of being folded in."""
import io
import sys

P = "lib/mos/schedule3-parser.ts"
s = io.open(P, encoding="utf-8").read()


def swap(old, new):
    global s
    if old not in s:
        print("MISS:", old[:100])
        sys.exit(1)
    s = s.replace(old, new, 1)


# --- The contract, restated -------------------------------------------------
swap(
    ''' *   Unit (e.g. 1.3.2 CADA)
 *     Topic       2. Aerodynamics
 *       Sub-topic 2.1 Changes in angle of attack
 *         Element 2.1.1 Explain the effect of changes in angle of attack...
 *           Item  (a) pressure changes above and below an aerofoil
 *
 * Items are what content maps to and what coverage counts. An element with
 * lettered paragraphs contributes one item per paragraph; an element without
 * them is an item on its own. Deeper levels - (i), (A) and notes - are folded
 * into the text of the item above, because nobody writes a question for
 * "(iv) ammeter" in isolation from its stem.''',
    ''' *   Unit (e.g. 1.3.2 CADA)
 *     Topic       2. Aerodynamics
 *       Sub-topic 2.1 Changes in angle of attack
 *         Element 2.1.1 Explain the effect of changes in angle of attack...
 *           Item  (a) pressure changes above and below an aerofoil
 *
 * Items are what content maps to and what coverage counts, so the split has to
 * land where a question would: one item per assessable thing.
 *
 * An element with lettered paragraphs contributes one item per paragraph, and
 * an element without them is an item on its own. Where a paragraph itself lists
 * roman sub-points - "(a) fuel system components, including the following:
 * (i) auxiliary/booster pump; (ii) fuel drain; ..." - each sub-point becomes
 * its own item, because each is a separate thing to be examined on. The
 * paragraph is then a lead-in rather than an item, and its words are carried on
 * every child so each one still reads in full.
 *
 * Capitals, "(A)", and notes are folded into the item above: that is as deep as
 * the Schedule goes before it stops describing separate knowledge.''',
)

# --- The item gains its paragraph's lead-in ---------------------------------
swap(
    '''export interface ParsedItem {
  /** "2.1.1(a)", or "2.1.1" for an element without paragraphs. */
  ref: string
  /** The item's own words, with deeper sub-points folded in. */
  text: string
}''',
    '''export interface ParsedItem {
  /** "2.1.1(a)", "2.2.1(a)(i)", or "2.1.1" for an element without paragraphs. */
  ref: string
  /** The item's own words, with any deeper sub-points folded in. */
  text: string
  /** The lettered paragraph this is a sub-point of, when it has one. */
  lead?: string
}''',
)

# --- Tracking the open paragraph so its sub-points can hang off it ----------
swap(
    '''  let lastLetter: string | null = null
  let lastRoman: string | null = null
  let inRoman = false''',
    '''  let lastLetter: string | null = null
  let lastRoman: string | null = null
  let inRoman = false
  /** The lettered paragraph roman sub-points attach to, and its token. */
  let letterItem: ParsedItem | null = null
  let letterToken: string | null = null
  /** Its words, kept once it turns out to be a lead-in rather than an item. */
  let letterLead: string | undefined''',
)

swap(
    '''  const closeElement = () => {
    element = null
    target = null
    lastLetter = null
    lastRoman = null
    inRoman = false
  }''',
    '''  const closeElement = () => {
    element = null
    target = null
    lastLetter = null
    lastRoman = null
    inRoman = false
    letterItem = null
    letterToken = null
    letterLead = undefined
  }''',
)

# --- The split itself -------------------------------------------------------
swap(
    '''      const current = element as ParsedElement
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
      continue''',
    '''      const current = element as ParsedElement
      /** Refs have to stay unique; CASA's numbering doesn't always oblige. */
      const freeRef = (build: (t: string) => string, wanted: string, sequence: string[]) => {
        if (!current.items.some((it) => it.ref === build(wanted))) return wanted
        return sequence.find((t) => !current.items.some((it) => it.ref === build(t))) ?? wanted
      }

      if (kind === "letter") {
        // CASA occasionally re-uses a letter (ANVC 2.9.6 has "(a)" after "(b)").
        const letters = Array.from({ length: 26 }, (_, n) => String.fromCharCode(97 + n))
        token = freeRef((t) => `${current.number}(${t})`, token, letters)
        const item: ParsedItem = { ref: `${current.number}(${token})`, text: tidy(text) }
        current.items.push(item)
        lastLetter = token
        lastRoman = null
        inRoman = false
        letterItem = item
        letterToken = token
        letterLead = undefined
        target = item
      } else if (kind === "roman") {
        if (letterItem && letterToken) {
          // The first sub-point demotes its paragraph: it was introducing a
          // list, not describing something examinable in its own right.
          if (letterLead === undefined) {
            const at = current.items.indexOf(letterItem)
            if (at >= 0) current.items.splice(at, 1)
            letterLead = letterItem.text
          }
          const ref = (t: string) => `${current.number}(${letterToken})(${t})`
          const chosen = freeRef(ref, token, ROMANS)
          const child: ParsedItem = { ref: ref(chosen), text: tidy(text) }
          if (letterLead) child.lead = letterLead
          current.items.push(child)
          target = child
        } else {
          // Romans straight off the element, with no lettered paragraph above.
          const ref = (t: string) => `${current.number}(${t})`
          const chosen = freeRef(ref, token, ROMANS)
          const item: ParsedItem = { ref: ref(chosen), text: tidy(text) }
          current.items.push(item)
          target = item
        }
        lastRoman = token
        inRoman = true
      } else {
        // A capital, "(A)": deeper than we split, so it joins the item above.
        const host = current.items[current.items.length - 1] ?? current
        host.text = `${host.text} (${token}) ${tidy(text)}`
        target = host
      }
      continue''',
)

# --- Full wording now has three levels to stitch ----------------------------
swap(
    '''/** Full, self-contained wording of an item: the element's stem plus the paragraph. */
export function itemFullText(element: Pick<ParsedElement, "text">, item: ParsedItem) {
  if (!item.text) return element.text
  const stem = element.text.replace(/[:;,]\\s*$/, "")
  return `${stem}: ${item.text.replace(/[;.]\\s*(and|or)?\\s*$/i, "")}`
}''',
    '''/**
 * Full, self-contained wording of an item: the element's stem, the lettered
 * paragraph it sits under if there is one, then the item's own words. A sub-point
 * like "auxiliary/booster pump" means nothing without the two lines above it.
 */
export function itemFullText(element: Pick<ParsedElement, "text">, item: ParsedItem) {
  if (!item.text) return element.text
  const trail = (value: string) => value.replace(/[:;,]\\s*$/, "")
  const parts = [trail(element.text)]
  if (item.lead) parts.push(trail(item.lead))
  parts.push(item.text.replace(/[;.]\\s*(and|or)?\\s*$/i, ""))
  return parts.join(": ")
}''',
)

io.open(P, "w", encoding="utf-8").write(s)
print("ok", P)
