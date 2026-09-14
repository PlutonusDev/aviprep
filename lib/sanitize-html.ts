/**
 * Allowlist sanitiser for user-written HTML (forum posts).
 *
 * Posts were rendered with dangerouslySetInnerHTML straight from the database,
 * so anyone could store a <script> or an onerror= handler and run it in every
 * reader's session. This rebuilds the markup from an allowlist instead.
 *
 * Browser-only: it parses with DOMParser, which builds an inert document -
 * nothing in it runs or loads while we walk it.
 */

const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s", "strike", "a", "ul", "ol", "li",
  "blockquote", "h1", "h2", "h3", "h4", "code", "pre", "img", "span", "hr",
  "table", "thead", "tbody", "tr", "th", "td",
])

/** Tags removed along with everything inside them. */
const DROP_WITH_CONTENT = new Set(["script", "style", "iframe", "object", "embed", "template", "svg", "math", "noscript"])

/** Containers whose whitespace-only children are layout, not text. */
const BLOCK_PARENTS = new Set(["body", "div", "ul", "ol", "blockquote", "table", "thead", "tbody", "tr"])

const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ["href"],
  img: ["src", "alt", "width", "height"],
  span: ["data-type", "data-id", "data-label"],
  th: ["colspan", "rowspan"],
  td: ["colspan", "rowspan"],
}

function safeUrl(value: string, kind: "href" | "src"): string | null {
  const v = value.trim()
  if (v.startsWith("/") && !v.startsWith("//")) return v
  try {
    const url = new URL(v)
    const ok = kind === "href" ? ["http:", "https:", "mailto:"] : ["http:", "https:"]
    return ok.includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

function clean(node: Node, out: Document): Node | DocumentFragment | null {
  if (node.nodeType === 3) {
    const text = node.textContent ?? ""
    // Indentation/newlines between block tags is source formatting, not content.
    const parent = node.parentElement?.tagName.toLowerCase()
    if (!text.trim() && (!parent || BLOCK_PARENTS.has(parent))) return null
    return out.createTextNode(text)
  }
  if (node.nodeType !== 1) return null

  const el = node as Element
  const tag = el.tagName.toLowerCase()
  if (DROP_WITH_CONTENT.has(tag)) return null

  const children = out.createDocumentFragment()
  el.childNodes.forEach((child) => {
    const c = clean(child, out)
    if (c) children.appendChild(c)
  })

  // Unknown wrappers (div, font...) are unwrapped, keeping their text.
  if (!ALLOWED_TAGS.has(tag)) return children

  const copy = out.createElement(tag)
  for (const name of ALLOWED_ATTRS[tag] ?? []) {
    const value = el.getAttribute(name)
    if (value === null) continue
    if (name === "href" || name === "src") {
      const url = safeUrl(value, name)
      if (url) copy.setAttribute(name, url)
    } else if (name === "width" || name === "height" || name === "colspan" || name === "rowspan") {
      if (/^\d{1,4}$/.test(value)) copy.setAttribute(name, value)
    } else {
      copy.setAttribute(name, value)
    }
  }

  if (tag === "img" && !copy.getAttribute("src")) return null
  if (tag === "img") copy.setAttribute("loading", "lazy")
  if (tag === "a" && copy.getAttribute("href")) {
    copy.setAttribute("rel", "noopener noreferrer nofollow")
    if (/^https?:/.test(copy.getAttribute("href")!)) copy.setAttribute("target", "_blank")
  }

  copy.appendChild(children)
  return copy
}

export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return ""
  const source = new DOMParser().parseFromString(html, "text/html")
  const out = document.implementation.createHTMLDocument("")
  const root = out.createElement("div")
  source.body.childNodes.forEach((child) => {
    const c = clean(child, out)
    if (c) root.appendChild(c)
  })
  return root.innerHTML
}

/** Plain text of some HTML, for previews. Never rendered as HTML. */
export function htmlToText(html: string): string {
  if (typeof window === "undefined") return ""
  const doc = new DOMParser().parseFromString(html, "text/html")
  return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim()
}
