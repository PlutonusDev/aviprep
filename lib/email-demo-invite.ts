/**
 * The email that carries a demo code to a flight school or RTO.
 *
 * Same constraints as the rest of lib/email-*: tables for layout, styles
 * inlined on every element, absolute image URLs, no flex or grid.
 */

import { publicAssetUrl } from "@lib/public-url"

const INK = "#1E293B"
const MUTED = "#64748B"
const BORDER = "#E2E8F0"
const BRAND = "#F78601"
const SURFACE = "#F8FAFC"

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
}

function button(href: string, label: string) {
  // Table-wrapped so Outlook renders the fill rather than a bare link.
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
    <tr>
      <td style="background-color:${BRAND};border-radius:8px;">
        <a href="${href}" target="_blank"
           style="display:inline-block;padding:14px 28px;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:bold;color:#1E293B;text-decoration:none;border-radius:8px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`
}

export interface DemoInviteOptions {
  contactName: string | null
  organisation: string
  code: string
  url: string
  expiresAt: Date
  senderName: string
  note?: string | null
}

export function getDemoInviteTemplate({ contactName, organisation, code, url, expiresAt, senderName, note }: DemoInviteOptions) {
  const org = escapeHtml(organisation)
  const sender = escapeHtml(senderName)
  const expires = expiresAt.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })

  const personalNote = note
    ? `
      <tr>
        <td style="padding:0 32px 8px 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                 style="background-color:${SURFACE};border-left:3px solid ${BRAND};border-radius:0 10px 10px 0;">
            <tr>
              <td style="padding:16px 20px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:${INK};">
                ${escapeHtml(note)}
                <span style="display:block;margin-top:8px;font-size:13px;color:${MUTED};">&mdash; ${sender}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : ""

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>Your AviPrep demo</title>
</head>
<body style="margin:0;padding:0;background-color:${SURFACE};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your code is ${escapeHtml(code)}.</div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${SURFACE};">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600"
               style="width:100%;max-width:600px;background-color:#FFFFFF;border:1px solid ${BORDER};border-radius:14px;">

          <tr>
            <td align="center" style="padding:36px 32px 8px 32px;">
              <img src="${publicAssetUrl("/email/logo.png")}" alt="AviPrep" height="34" style="display:block;max-height:34px;border:0;outline:none;text-decoration:none;">
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px 0 32px;font-family:Helvetica,Arial,sans-serif;">
              <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.25;color:${INK};font-weight:bold;">
                Your AviPrep demo
              </h1>
              ${contactName ? `<p style="margin:0 0 8px 0;font-size:16px;line-height:1.65;color:${INK};">Hi ${escapeHtml(contactName)},</p>` : ""}
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.65;color:${MUTED};">
                Here's the school panel as ${org} would use it: students, groups, progress, seats, branding and the API. The students in it are made up.
              </p>
            </td>
          </tr>

          ${personalNote}

          <tr>
            <td style="padding:8px 32px 0 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                     style="background-color:${SURFACE};border:1px solid ${BORDER};border-radius:10px;">
                <tr>
                  <td align="center" style="padding:20px;font-family:Helvetica,Arial,sans-serif;">
                    <p style="margin:0 0 8px 0;font-size:13px;font-weight:bold;letter-spacing:0.04em;text-transform:uppercase;color:${MUTED};">Your code</p>
                    <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:28px;font-weight:bold;letter-spacing:0.12em;color:${INK};">${escapeHtml(code)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:24px 32px 8px 32px;">
              ${button(url, "Open the demo")}
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:0 32px 28px 32px;font-family:Helvetica,Arial,sans-serif;">
              <p style="margin:0 0 10px 0;font-size:13px;line-height:1.6;color:${MUTED};">
                Or paste this into your browser:<br>
                <a href="${url}" style="color:${MUTED};text-decoration:underline;word-break:break-all;">${escapeHtml(url)}</a>
              </p>
              <p style="margin:0;font-size:13px;color:${MUTED};">Works until ${escapeHtml(expires)}.</p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px;">
              <div style="height:1px;background-color:${BORDER};font-size:0;line-height:0;">&nbsp;</div>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 32px 32px 32px;font-family:Helvetica,Arial,sans-serif;">
              <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
                Questions, or want it set up for your own students? Reply to this email.
              </p>
            </td>
          </tr>
        </table>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;">
          <tr>
            <td align="center" style="padding:20px 16px;font-family:Helvetica,Arial,sans-serif;">
              <p style="margin:0;font-size:12px;color:${MUTED};">Sent by AviPrep to ${org}.</p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`
}
