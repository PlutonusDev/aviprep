/**
 * To admins on the 1st: last month's statements are drafted and waiting.
 * Tables and inline styles for email clients (see email-curator-invite.ts).
 */

import { publicAssetUrl } from "@lib/public-url"
import { aud } from "@lib/finance/money"

const INK = "#0F172A"
const TEXT = "#334155"
const MUTED = "#64748B"
const BORDER = "#E2E8F0"
const BRAND = "#F78601"
const BRAND_INK = "#B45F00"
const WARM = "#FFF7EC"
const SURFACE = "#F8FAFC"
const FONT = "Helvetica,Arial,sans-serif"

function tile(label: string, value: string) {
  return `<td width="50%" valign="top" style="padding:6px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${SURFACE};border-radius:10px;">
      <tr><td style="padding:14px 16px;font-family:${FONT};">
        <p style="margin:0;font-size:12px;line-height:16px;color:${MUTED};">${label}</p>
        <p style="margin:4px 0 0 0;font-size:18px;line-height:24px;font-weight:bold;color:${INK};">${value}</p>
      </td></tr>
    </table>
  </td>`
}

export function statementsReadyEmail({
  label,
  totals,
  url,
}: {
  period: string
  label: string
  totals: { statements: number; royaltyCents: number; gstCents: number; withholdingCents: number; payableCents: number; invoices: number; needAttention: number }
  url: string
}) {
  const none = totals.statements === 0
  const subject = none ? `No royalty statements for ${label}` : `${label} royalty statements are ready to send: ${aud(totals.payableCents)}`
  const intro = none
    ? `Nobody earned royalties in ${label}, so there’s nothing to send.`
    : `${totals.statements} statement${totals.statements === 1 ? "" : "s"} and ${totals.invoices} RCTI${totals.invoices === 1 ? "" : "s"} for ${label} have been drafted with the month’s final figures. Nothing has gone to curators yet. Review them, send them, then pay through Stripe.`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:${SURFACE};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${none ? intro : `${aud(totals.payableCents)} to pay across ${totals.statements} curators.`}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${SURFACE};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background-color:#FFFFFF;border:1px solid ${BORDER};border-radius:16px;overflow:hidden;">
          <tr><td height="4" style="height:4px;line-height:4px;font-size:0;background-color:${BRAND};">&nbsp;</td></tr>
          <tr><td style="padding:32px 40px 8px 40px;"><img src="${publicAssetUrl("/email/logo.png")}" alt="AviPrep" height="42" style="display:block;max-height:42px;border:0;"></td></tr>
          <tr>
            <td style="padding:24px 40px 0 40px;font-family:${FONT};">
              <p style="margin:0;font-size:12px;line-height:16px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND_INK};">Curator payouts</p>
              <h1 style="margin:8px 0 0 0;font-size:26px;line-height:32px;font-weight:bold;color:${INK};">${label} is ready to send</h1>
              <p style="margin:14px 0 20px 0;font-size:16px;line-height:26px;color:${TEXT};">${intro}</p>
            </td>
          </tr>
          ${
            none
              ? ""
              : `<tr><td style="padding:0 34px 8px 34px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td colspan="2" style="padding:6px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${WARM};border-radius:10px;">
                    <tr><td style="padding:16px 18px;font-family:${FONT};">
                      <p style="margin:0;font-size:13px;line-height:18px;color:${TEXT};">To pay</p>
                      <p style="margin:4px 0 0 0;font-size:30px;line-height:36px;font-weight:bold;color:${INK};">${aud(totals.payableCents)}</p>
                    </td></tr>
                  </table>
                </td>
              </tr>
              <tr>${tile("Royalties", aud(totals.royaltyCents))}${tile("GST", aud(totals.gstCents))}</tr>
              <tr>${tile("Withheld for the ATO", aud(totals.withholdingCents))}${tile("Statements", String(totals.statements))}</tr>
            </table>
          </td></tr>
          ${
            totals.needAttention
              ? `<tr><td style="padding:8px 40px 0 40px;font-family:${FONT};"><p style="margin:0;font-size:14px;line-height:22px;color:${TEXT};"><strong style="color:${INK};">${totals.needAttention} curator${totals.needAttention === 1 ? " needs" : "s need"} attention</strong> before they can be paid: missing tax details or Stripe payouts not set up.</p></td></tr>`
              : ""
          }`
          }
          <tr>
            <td style="padding:24px 40px 36px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="background-color:${BRAND};border-radius:10px;">
                  <a href="${url}" target="_blank" style="display:inline-block;padding:14px 26px;font-family:${FONT};font-size:15px;font-weight:bold;color:${INK};text-decoration:none;border-radius:10px;">Review and send</a>
                </td>
              </tr></table>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0 0;font-family:${FONT};font-size:12px;line-height:18px;color:${MUTED};">Sent to AviPrep admins on the 1st of each month.</p>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = none
    ? `${intro}\n\n${url}`
    : [
        intro,
        "",
        `To pay: ${aud(totals.payableCents)}`,
        `Royalties: ${aud(totals.royaltyCents)}`,
        `GST: ${aud(totals.gstCents)}`,
        `Withheld for the ATO: ${aud(totals.withholdingCents)}`,
        totals.needAttention ? `${totals.needAttention} curator(s) need attention before they can be paid.` : "",
        "",
        `Review and send: ${url}`,
      ]
        .filter((l) => l !== null)
        .join("\n")

  return { subject, html, text }
}
