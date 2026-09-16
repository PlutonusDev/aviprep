/**
 * Monthly royalty statement email. Tables and inline styles for email clients
 * (see email-curator-invite.ts). The statement and invoice are attached.
 */

import { publicAssetUrl } from "@lib/public-url"
import { INVOICE_KIND_LABELS, aud } from "@lib/finance/money"
import type { StatementSnapshot } from "@lib/finance/payouts"

const INK = "#0F172A"
const TEXT = "#334155"
const MUTED = "#64748B"
const BORDER = "#E2E8F0"
const BRAND = "#F78601"
const BRAND_INK = "#B45F00"
const WARM = "#FFF7EC"
const SURFACE = "#F8FAFC"
const FONT = "Helvetica,Arial,sans-serif"

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

function row(label: string, value: string, strong = false) {
  return `<tr>
    <td style="padding:5px 0;font-family:${FONT};font-size:14px;line-height:20px;color:${strong ? INK : MUTED};${strong ? "font-weight:bold;" : ""}">${label}</td>
    <td align="right" style="padding:5px 0;font-family:${FONT};font-size:14px;line-height:20px;color:${INK};font-weight:bold;">${value}</td>
  </tr>`
}

export function royaltyStatementEmail(s: StatementSnapshot, firstName: string) {
  const due = new Date(s.dueDate).toLocaleDateString("en-AU", { day: "numeric", month: "long", timeZone: "Australia/Sydney" })
  const t = s.totals
  const paying = t.payableCents > 0
  const preheader = paying ? `${aud(t.payableCents)} in royalties for ${s.periodLabel}, paid by ${due}.` : `Your royalty statement for ${s.periodLabel}.`

  const breakdown = [
    row("Royalties", aud(t.royaltyCents)),
    t.gstCents ? row("GST", aud(t.gstCents)) : "",
    t.withholdingCents ? row("Withheld for the ATO (47%)", `−${aud(t.withholdingCents)}`) : "",
  ].join("")

  const attachments = [`Royalty statement ${escapeHtml(s.number)}`, s.invoiceKind !== "none" ? `${INVOICE_KIND_LABELS[s.invoiceKind]} ${escapeHtml(s.number)}` : null]
    .filter(Boolean)
    .map((name) => `<li style="margin:0 0 4px 0;">${name} (PDF)</li>`)
    .join("")

  const payment = !paying
    ? "There’s nothing to pay this month."
    : s.bank
      ? `We’ll pay it through Stripe to your account ending ${escapeHtml(s.bank.last4)} by ${due}.`
      : `To be paid, set up payouts from your AviPrep dashboard. It takes a few minutes on Stripe, and we’ll pay you once it’s done.`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>Your AviPrep royalties for ${escapeHtml(s.periodLabel)}</title>
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
              <p style="margin:0;font-size:12px;line-height:16px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND_INK};">Royalty statement</p>
              <h1 style="margin:8px 0 0 0;font-size:26px;line-height:32px;font-weight:bold;color:${INK};">${escapeHtml(s.periodLabel)}</h1>
              <p style="margin:14px 0 24px 0;font-size:16px;line-height:26px;color:${TEXT};">
                Hi ${escapeHtml(firstName)}, here are your royalties for ${escapeHtml(s.periodLabel)}. Thanks for everything you’ve written.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 8px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${WARM};border-radius:12px;">
                <tr>
                  <td style="padding:20px 22px 14px 22px;font-family:${FONT};">
                    <p style="margin:0;font-size:14px;line-height:20px;color:${TEXT};">Amount payable</p>
                    <p style="margin:4px 0 12px 0;font-size:32px;line-height:38px;font-weight:bold;color:${INK};">${aud(t.payableCents)}</p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid #F4DDBF;">
                      ${breakdown}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 40px 0 40px;font-family:${FONT};">
              <p style="margin:0;font-size:15px;line-height:24px;color:${TEXT};">${payment}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 32px 40px;font-family:${FONT};">
              <p style="margin:0 0 8px 0;font-size:12px;line-height:16px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED};">Attached</p>
              <ul style="margin:0;padding:0 0 0 18px;font-size:14px;line-height:22px;color:${TEXT};">${attachments}</ul>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 28px 40px;background-color:${SURFACE};border-top:1px solid ${BORDER};font-family:${FONT};">
              <p style="margin:0;font-size:13px;line-height:20px;color:${MUTED};">Your statements and invoices are also on your dashboard at curators.aviprep.com.au. Something not right? Reply within 14 days and we’ll fix it.</p>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0 0;font-family:${FONT};font-size:12px;line-height:18px;color:${MUTED};">AviPrep · ABN 80 167 432 520 · aviprep.com.au</p>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = [
    `Hi ${firstName},`,
    "",
    `Your AviPrep royalties for ${s.periodLabel}: ${aud(t.payableCents)}.`,
    `Royalties ${aud(t.royaltyCents)}${t.gstCents ? `, GST ${aud(t.gstCents)}` : ""}${t.withholdingCents ? `, withheld for the ATO ${aud(t.withholdingCents)}` : ""}.`,
    payment,
    "",
    "Your statement is attached. Reply within 14 days if anything's wrong.",
  ].join("\n")

  return {
    subject: paying ? `Your AviPrep royalties for ${s.periodLabel}: ${aud(t.payableCents)}` : `Your AviPrep royalty statement for ${s.periodLabel}`,
    html,
    text,
  }
}
