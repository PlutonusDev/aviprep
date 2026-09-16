/**
 * Invitation to create a curator account.
 *
 * Email constraints, not web ones: tables for layout, inline styles on every
 * element, absolute image URLs, no flex or grid. See email-school-welcome.ts.
 */

import { publicAssetUrl } from "@lib/public-url"

const INK = "#0F172A"
const TEXT = "#334155"
const MUTED = "#64748B"
const BORDER = "#E2E8F0"
const BRAND = "#F78601"
const BRAND_INK = "#B45F00"
const WARM = "#FFF7EC"
const SURFACE = "#F8FAFC"
const FONT = "Helvetica,Arial,sans-serif"

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
}

function step(n: number, title: string, text: string) {
  return `
  <tr>
    <td style="padding:0 0 14px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td width="36" valign="top" style="padding-top:1px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="24" height="24" align="center" valign="middle" style="width:24px;height:24px;border-radius:12px;background-color:${BRAND};font-family:${FONT};font-size:12px;font-weight:bold;color:#FFFFFF;">${n}</td>
          </tr></table>
        </td>
        <td valign="top" style="font-family:${FONT};">
          <p style="margin:0;font-size:15px;line-height:22px;font-weight:bold;color:${INK};">${title}</p>
          <p style="margin:2px 0 0 0;font-size:14px;line-height:21px;color:${MUTED};">${text}</p>
        </td>
      </tr></table>
    </td>
  </tr>`
}

export interface CuratorInviteOptions {
  firstName: string | null
  inviterName: string
  note: string | null
  joinUrl: string
  expiresAt: Date
  hasGuidelines: boolean
}

export function getCuratorInviteTemplate({ firstName, inviterName, note, joinUrl, expiresAt, hasGuidelines }: CuratorInviteOptions) {
  const name = firstName ? escapeHtml(firstName) : null
  const inviter = escapeHtml(inviterName)
  const until = expiresAt.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })
  const preheader = `${inviterName} has invited you to write for AviPrep. Set up your account in a couple of minutes.`

  const noteBlock = note
    ? `
      <tr>
        <td style="padding:0 40px 28px 40px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${WARM};border-radius:12px;">
            <tr>
              <td style="padding:18px 22px;font-family:${FONT};">
                <p style="margin:0;font-size:15px;line-height:24px;color:${TEXT};white-space:pre-line;">${escapeHtml(note)}</p>
                <p style="margin:10px 0 0 0;font-size:13px;line-height:18px;font-weight:bold;color:${BRAND_INK};">${inviter}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : ""

  const guidelinesBlock = hasGuidelines
    ? `
      <tr>
        <td style="padding:8px 40px 32px 40px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${BORDER};border-radius:12px;">
            <tr>
              <td width="64" valign="middle" style="padding:16px 0 16px 18px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                  <td width="40" height="48" align="center" valign="bottom" style="width:40px;height:48px;background-color:${WARM};border-radius:6px;padding-bottom:8px;font-family:${FONT};font-size:10px;font-weight:bold;letter-spacing:0.06em;color:${BRAND_INK};">PDF</td>
                </tr></table>
              </td>
              <td valign="middle" style="padding:16px 18px 16px 4px;font-family:${FONT};">
                <p style="margin:0;font-size:15px;line-height:22px;font-weight:bold;color:${INK};">Content guidelines</p>
                <p style="margin:2px 0 0 0;font-size:14px;line-height:20px;color:${MUTED};">Attached. How we write questions and explanations, tag to the MOS and assign points.</p>
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
<title>You're invited to write for AviPrep</title>
</head>
<body style="margin:0;padding:0;background-color:${SURFACE};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${SURFACE};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background-color:#FFFFFF;border:1px solid ${BORDER};border-radius:16px;overflow:hidden;">
          <tr><td height="4" style="height:4px;line-height:4px;font-size:0;background-color:${BRAND};">&nbsp;</td></tr>
          <tr>
            <td style="padding:32px 40px 8px 40px;">
              <img src="${publicAssetUrl("/email/logo.png")}" alt="AviPrep" height="42" style="display:block;max-height:42px;border:0;outline:none;text-decoration:none;">
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 0 40px;font-family:${FONT};">
              <h1 style="margin:8px 0 0 0;font-size:26px;line-height:32px;font-weight:bold;color:${INK};">${name ? `${name}, come write with us` : "Come write with us"}</h1>
              <p style="margin:14px 0 28px 0;font-size:16px;line-height:26px;color:${TEXT};">
                You've been invited to join AviPrep as a content curator. You’ll write questions and lessons that help student pilots pass their CASA theory exams, and earn royalties on everything that goes live.
              </p>
            </td>
          </tr>
          ${noteBlock}
          <tr>
            <td style="padding:0 40px 12px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:${BRAND};border-radius:10px;">
                    <a href="${joinUrl}" target="_blank" style="display:inline-block;padding:15px 30px;font-family:${FONT};font-size:16px;font-weight:bold;color:${INK};text-decoration:none;border-radius:10px;">Set up your account</a>
                  </td>
                </tr>
              </table>
              <p style="margin:12px 0 0 0;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};">Invite expires ${until}.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px 14px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid ${BORDER};">
                <tr><td style="padding:24px 0 16px 0;font-family:${FONT};font-size:12px;line-height:16px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED};">What happens next</td></tr>
                ${step(1, "Check your details", "We’ve prefilled some details. Check them and choose a password.")}
                ${step(2, "Confirm your mobile", "Mobile 2FA is enabled by default. We’ll text a code to confirm.")}
                ${step(3, "Start writing", "You’ll land in the content studio at curators.aviprep.com.au.")}
              </table>
            </td>
          </tr>
          ${guidelinesBlock}
          <tr>
            <td style="padding:20px 40px 32px 40px;background-color:${SURFACE};border-top:1px solid ${BORDER};font-family:${FONT};">
              <p style="margin:0;font-size:13px;line-height:20px;color:${MUTED};">Button not working? Paste this into your browser:</p>
              <p style="margin:4px 0 0 0;font-size:13px;line-height:20px;word-break:break-all;"><a href="${joinUrl}" style="color:#1B5F99;text-decoration:underline;">${joinUrl}</a></p>
              <p style="margin:16px 0 0 0;font-size:13px;line-height:20px;color:${MUTED};">You’re getting this because ${inviter} invited this address to AviPrep. If you weren’t expecting it, you can ignore it and nothing will be set up.</p>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0 0;font-family:${FONT};font-size:12px;line-height:18px;color:${MUTED};">AviPrep · ABN 80 167 432 520 · aviprep.com.au</p>
      </td>
    </tr>
  </table>
</body>
</html>`
}
