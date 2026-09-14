import { NextResponse } from "next/server"
import { getSubdomain, mainSiteUrl } from "@lib/tenant"

/**
 * Sends a visitor from an unowned subdomain to the same path on the main site.
 *
 * This exists because proxy.ts cannot do it directly. Next's proxy adapter
 * rewrites any `Location` whose host matches the incoming request URL into a
 * relative one - and in dev that request URL is the server's own
 * localhost:8001, which is also the main site. So the proxy's redirect came out
 * as `Location: /`, the browser resolved it back onto the subdomain, and it
 * looped. Route handlers are not normalised that way, so the real cross-host
 * hop happens here instead.
 */
export function GET(request: Request) {
  const url = new URL(request.url)
  const host = request.headers.get("host") || url.host

  // Only ever a same-site path. Anything else - an absolute URL, or a
  // protocol-relative "//evil.com" - would make this an open redirect.
  const raw = url.searchParams.get("to") || "/"
  const to = raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\") ? raw : "/"

  const [pathname, ...rest] = to.split("?")
  const search = rest.length ? `?${rest.join("?")}` : ""

  const subdomain = getSubdomain(host)
  const protocol = request.headers.get("x-forwarded-proto") || url.protocol

  const destination = subdomain
    ? mainSiteUrl({ host, protocol, pathname, search, subdomain })
    : new URL(`${protocol.replace(/:$/, "")}://${host}${pathname}${search}`)

  // Temporary: the subdomain may belong to a school later.
  return NextResponse.redirect(destination, 307)
}
