/**
 * The words a question or lesson is "about", for matching against Schedule 3.
 * Safe for client and server (no DOM).
 */

const MAX_CHARS = 6000

export function stripHtml(html: string) {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

export function questionMatchText(q: { questionText?: string; options?: string[]; correctIndex?: number; explanation?: string; topic?: string }) {
  const correct = q.options?.[q.correctIndex ?? -1]
  return [q.topic, q.questionText, correct && `Answer: ${correct}`, q.explanation]
    .filter(Boolean)
    .join("\n")
    .slice(0, MAX_CHARS)
}

/** Keys in lesson content that hold identifiers or media rather than words. */
const NON_TEXT_KEYS = new Set(["id", "url", "src", "type", "thumbnail", "duration", "correctIndex", "order"])

/**
 * Lesson content comes in several shapes (text, media, quiz, flashcards,
 * exercises), so rather than know each one, collect every string in it.
 */
export function lessonMatchText(lesson: { title?: string; description?: string | null; content?: unknown }) {
  const parts: string[] = [lesson.title ?? "", lesson.description ?? ""]
  let length = 0

  const walk = (value: unknown, key?: string) => {
    if (length > MAX_CHARS || (key && NON_TEXT_KEYS.has(key))) return
    if (typeof value === "string") {
      const text = /<[a-z][\s\S]*>/i.test(value) ? stripHtml(value) : value.trim()
      if (text && !/^https?:\/\//.test(text)) {
        parts.push(text)
        length += text.length
      }
    } else if (Array.isArray(value)) {
      for (const v of value) walk(v)
    } else if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) walk(v, k)
    }
  }
  walk(lesson.content)

  return parts.filter(Boolean).join("\n").slice(0, MAX_CHARS)
}
