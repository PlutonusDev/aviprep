/**
 * Tenant resolution, shared by proxy.ts and server routes.
 * Pure - no Prisma - so anything can import it cheaply.
 *
 * This logic used to be copy-pasted into the old middleware and /api/tenant,
 * which meant a fix in one did not reach the other.
 */

export const MAIN_DOMAINS = ["aviprep.com.au", "www.aviprep.com.au", "localhost"]

/**
 * Subdomains that are allowed to load even though no school owns them - staging,
 * status pages and so on. Everything else without an active school is sent back
 * to the main site.
 *
 * These behave as the main AviPrep site, not as a white-label school portal.
 * Lowercase, subdomain part only: "staging", not "staging.aviprep.com.au".
 */
export const ALLOWED_SUBDOMAINS: string[] = [
  // "staging",
]

export function isAllowedSubdomain(subdomain: string): boolean {
  return ALLOWED_SUBDOMAINS.includes(subdomain.toLowerCase())
}

/**
 * The same path on the main site, built from the real Host header.
 *
 * Deliberately not derived from `request.nextUrl`: in dev its hostname is the
 * server's own (localhost:8001), not the host the browser asked for. Stripping
 * the subdomain from that found nothing, produced a URL identical to the
 * request, and Next emitted it as a relative `Location: /` - which the browser
 * resolved back onto the subdomain and looped on forever.
 *
 * foo.aviprep.com.au/privacy?x=1 -> https://aviprep.com.au/privacy?x=1
 * foo.localhost:8001/login      -> http://localhost:8001/login
 */
export function mainSiteUrl({
  host,
  protocol,
  pathname,
  search,
  subdomain,
}: {
  host: string
  protocol: string
  pathname: string
  search: string
  subdomain: string
}): URL {
  const [hostname, port] = host.toLowerCase().split(":")
  const prefix = `${subdomain.toLowerCase()}.`
  const mainHost = hostname.startsWith(prefix) ? hostname.slice(prefix.length) : hostname
  const scheme = protocol.replace(/:$/, "")

  return new URL(`${scheme}://${mainHost}${port ? `:${port}` : ""}${pathname}${search}`)
}

export function getSubdomain(host: string): string | null {
  const hostWithoutPort = (host || "").split(":")[0].toLowerCase()

  if (!hostWithoutPort) return null
  if (MAIN_DOMAINS.includes(hostWithoutPort)) return null

  for (const domain of MAIN_DOMAINS) {
    if (hostWithoutPort.endsWith(`.${domain}`)) {
      const subdomain = hostWithoutPort.split(`.${domain}`)[0]
      if (subdomain && subdomain !== "www") return subdomain
    }
  }

  return null
}

/** True when the host is a school's white-label domain rather than AviPrep. */
export function isTenantHost(host: string): boolean {
  return getSubdomain(host) !== null
}
