"use client"

import { useEffect } from "react"

/**
 * Keeps the installed app off the marketing page.
 *
 * In standalone mode there's no address bar, so a link to "/" (the logo on the
 * legal pages, the 404's "Back to home", an old bookmark) would strand people on
 * a page built for browsers. We send them to the app entry instead: /m, which
 * the proxy forwards to the dashboard when signed in and shows sign-in otherwise.
 *
 * Detection is client-side on purpose: the app and the browser share cookies,
 * so a server-side flag would wrongly redirect ordinary browser visits too.
 */
const TARGET = "/m"

const SCRIPT = `(function(){try{if((window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)||window.navigator.standalone===true){window.location.replace("${TARGET}")}}catch(e){}})();`

export function AppHomeRedirect() {
  // Client-side navigations inside the app (the inline script only runs on a full load).
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (standalone) window.location.replace(TARGET)
  }, [])

  // Full page loads: runs while the HTML is parsed, before the page is painted,
  // so the marketing page never flashes up in the app.
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
}
