/**
 * Invitation for an instructor to join a flight school's AviPrep panel.
 *
 * Same email constraints as the rest of lib/email-*: tables for layout, styles
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

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

/** AviPrep's mark, a plus, then the school's - or a lettered badge if it has none. */
function coBrandLockup(schoolName: string, schoolLogo: string | null) {
  const logo = publicAssetUrl(schoolLogo)

  const schoolCell = logo
    ? `<img src="${logo}" alt="${escapeHtml(schoolName)}" height="40" style="display:block;max-height:40px;max-width:150px;border:0;outline:none;text-decoration:none;">`
    : `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
         <td style="width:40px;height:40px;background-color:${SURFACE};border:1px solid ${BORDER};border-radius:8px;text-align:center;vertical-align:middle;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;color:${INK};">
           ${escapeHtml(initials(schoolName) || "S")}
         </td>
       </tr></table>`

  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
    <tr>
      <td style="vertical-align:middle;padding-right:14px;">
        <img src="${publicAssetUrl("/email/logo.png")}" alt="AviPrep" height="34" style="display:block;max-height:34px;border:0;outline:none;text-decoration:none;">
      </td>
      <td style="vertical-align:middle;padding-right:14px;font-family:Helvetica,Arial,sans-serif;font-size:20px;line-height:20px;color:${MUTED};">+</td>
      <td style="vertical-align:middle;">${schoolCell}</td>
    </tr>
  </table>`
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

export interface SchoolInviteOptions {
  firstName: string | null
  schoolName: string
  schoolLogo?: string | null
  inviterName: string
  note?: string | null
  joinUrl: string
  expiresAt: Date
}

export function getSchoolInviteTemplate({ firstName, schoolName, schoolLogo, inviterName, note, joinUrl, expiresAt }: SchoolInviteOptions) {
  const school = escapeHtml(schoolName)
  const inviter = escapeHtml(inviterName)
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
                <span style="display:block;margin-top:8px;font-size:13px;color:${MUTED};">&mdash; ${inviter}</span>
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
<title>Join ${school} on AviPrep</title>
</head>
<body style="margin:0;padding:0;background-color:${SURFACE};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${inviter} invited you to help run ${school} on AviPrep.</div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${SURFACE};">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600"
               style="width:100%;max-width:600px;background-color:#FFFFFF;border:1px solid ${BORDER};border-radius:14px;">

          <tr>
            <td align="center" style="padding:36px 32px 8px 32px;">
              ${coBrandLockup(schoolName, schoolLogo ?? null)}
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px 0 32px;font-family:Helvetica,Arial,sans-serif;">
              <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.25;color:${INK};font-weight:bold;">
                Join ${school} on AviPrep
              </h1>
              ${firstName ? `<p style="margin:0 0 8px 0;font-size:16px;line-height:1.65;color:${INK};">Hi ${escapeHtml(firstName)},</p>` : ""}
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.65;color:${MUTED};">
                ${inviter} has invited you into the ${school} instructor panel. You'll be able to add students, set who sees which subjects, and follow how everyone is tracking towards their exams.
              </p>
            </td>
          </tr>

          ${personalNote}

          <tr>
            <td align="center" style="padding:24px 32px 8px 32px;">
              ${button(joinUrl, "Accept the invite")}
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:0 32px 28px 32px;font-family:Helvetica,Arial,sans-serif;">
              <p style="margin:0 0 10px 0;font-size:13px;line-height:1.6;color:${MUTED};">
                Or paste this into your browser:<br>
                <a href="${joinUrl}" style="color:${MUTED};text-decoration:underline;word-break:break-all;">${escapeHtml(joinUrl)}</a>
              </p>
              <p style="margin:0;font-size:13px;color:${MUTED};">The link works until ${escapeHtml(expires)}.</p>
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
                Not expecting this? You can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;">
          <tr>
            <td align="center" style="padding:20px 16px;font-family:Helvetica,Arial,sans-serif;">
              <p style="margin:0;font-size:12px;color:${MUTED};">Sent by AviPrep on behalf of ${school}.</p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`
}
