/**
 * The public origin for anything fetched from outside our servers - above all,
 * images in emails. Gmail, Outlook and friends download email images from their
 * own proxies, so "localhost" or a private address simply breaks them.
 *
 * NEXT_PUBLIC_SITE_URL is used when it's a real public address; otherwise (local
 * development, or a server still configured with a dev value) we fall back to
 * the production site. Override explicitly with PUBLIC_ASSET_URL if needed.
 */

const PRODUCTION = "https://aviprep.com.au"

function isPublicOrigin(value: string | undefined): value is string {
  if (!value) return false
  try {
    const { protocol, hostname } = new URL(value)
    if (protocol !== "https:" && protocol !== "http:") return false
    if (hostname === "localhost" || hostname.endsWith(".localhost")) return false
    if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0|\[?::1\]?$)/.test(hostname)) return false
    return true
  } catch {
    return false
  }
}

export const PUBLIC_ASSET_ORIGIN = (
  [process.env.PUBLIC_ASSET_URL, process.env.NEXT_PUBLIC_SITE_URL].find(isPublicOrigin) ?? PRODUCTION
).replace(/\/$/, "")

/** Absolute, publicly reachable URL for a path or an already-absolute URL. */
export function publicAssetUrl(src: string): string
export function publicAssetUrl(src: string | null | undefined): string | null
export function publicAssetUrl(src: string | null | undefined): string | null {
  if (!src) return null
  if (/^https?:\/\//i.test(src)) {
    // An absolute URL pointing at localhost (e.g. saved during development) is
    // rewritten onto the public origin, keeping its path.
    try {
      const url = new URL(src)
      if (!isPublicOrigin(url.origin)) return `${PUBLIC_ASSET_ORIGIN}${url.pathname}${url.search}`
    } catch {
      return null
    }
    return src
  }
  return `${PUBLIC_ASSET_ORIGIN}${src.startsWith("/") ? "" : "/"}${src}`
}
