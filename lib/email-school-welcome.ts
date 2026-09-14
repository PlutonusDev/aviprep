/**
 * Welcome email for a student added to a flight school.
 *
 * Written to email constraints rather than web ones: tables for layout, styles
 * inlined on every element (Gmail strips <style> in clipped/forwarded views),
 * absolute image URLs, and no flex or grid.
 */

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://aviprep.com.au").replace(/\/$/, "")

const INK = "#1E293B"
const MUTED = "#64748B"
const BORDER = "#E2E8F0"
const BRAND = "#F78601"
const SURFACE = "#F8FAFC"

/** School logos are often stored as an upload path; email needs a full URL. */
function absoluteUrl(src: string | null | undefined): string | null {
  if (!src) return null
  if (/^https?:\/\//i.test(src)) return src
  return `${SITE_URL}${src.startsWith("/") ? "" : "/"}${src}`
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  )
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

/**
 * AviPrep mark, a plus, then the school's. Falls back to a lettered badge when
 * the school has not uploaded a logo, so the lockup never renders half-empty.
 */
function coBrandLockup(schoolName: string, schoolLogo: string | null) {
  const logo = absoluteUrl(schoolLogo)

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
        <img src="${SITE_URL}/email/logo.png" alt="AviPrep" height="34" style="display:block;max-height:34px;border:0;outline:none;text-decoration:none;">
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

export interface SchoolWelcomeOptions {
  firstName: string
  email: string
  schoolName: string
  schoolLogo?: string | null
  loginUrl: string
  /** Present only when the account was just created for them. */
  tempPassword?: string
}

/**
 * Transactional, so it carries no unsubscribe link and states the real reason
 * the person is receiving it - the old shared shell claimed they had signed up
 * to the AviPrep waitlist, which was untrue for an enrolment.
 */
export function getSchoolWelcomeTemplate({
  firstName,
  email,
  schoolName,
  schoolLogo,
  loginUrl,
  tempPassword,
}: SchoolWelcomeOptions) {
  const isNewAccount = !!tempPassword
  const school = escapeHtml(schoolName)

  const preheader = isNewAccount
    ? `Your ${school} training account is ready - sign in and set a password.`
    : `${school} now manages your AviPrep account.`

  const credentials = isNewAccount
    ? `
      <tr>
        <td style="padding:0 32px 8px 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                 style="background-color:${SURFACE};border:1px solid ${BORDER};border-radius:10px;">
            <tr>
              <td style="padding:18px 20px;font-family:Helvetica,Arial,sans-serif;">
                <p style="margin:0 0 12px 0;font-size:13px;font-weight:bold;letter-spacing:0.04em;text-transform:uppercase;color:${MUTED};">
                  Your sign-in details
                </p>
                <p style="margin:0 0 6px 0;font-size:15px;color:${MUTED};">Email</p>
                <p style="margin:0 0 14px 0;font-size:16px;color:${INK};font-weight:bold;word-break:break-all;">${escapeHtml(email)}</p>
                <p style="margin:0 0 6px 0;font-size:15px;color:${MUTED};">Temporary password</p>
                <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:18px;color:${INK};font-weight:bold;letter-spacing:0.05em;">${escapeHtml(tempPassword!)}</p>
              </td>
            </tr>
          </table>
          <p style="margin:12px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:${MUTED};">
            Change this password as soon as you sign in - it was generated for you and is only meant to get you in the first time.
          </p>
        </td>
      </tr>`
    : ""

  const intro = isNewAccount
    ? `<strong>${school}</strong> has set up an AviPrep account for you. Everything you need for your theory exams is waiting inside - practice questions, course material and your results.`
    : `<strong>${school}</strong> now manages your AviPrep account. Your existing progress and results are unchanged; you simply sign in through your school's portal from now on.`

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>Welcome to ${school} on AviPrep</title>
</head>
<body style="margin:0;padding:0;background-color:${SURFACE};">
  <!-- Preheader: the grey line beside the subject in most inboxes. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>

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
                ${isNewAccount ? `Welcome to ${school}` : `You've been added to ${school}`}
              </h1>
              <p style="margin:0 0 8px 0;font-size:16px;line-height:1.65;color:${INK};">Hi ${escapeHtml(firstName)},</p>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.65;color:${MUTED};">${intro}</p>
            </td>
          </tr>

          ${credentials}

          <tr>
            <td align="center" style="padding:24px 32px 8px 32px;">
              ${button(loginUrl, isNewAccount ? "Sign in and get started" : "Go to your portal")}
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:0 32px 28px 32px;font-family:Helvetica,Arial,sans-serif;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED};">
                Or paste this into your browser:<br>
                <a href="${loginUrl}" style="color:${MUTED};text-decoration:underline;word-break:break-all;">${escapeHtml(loginUrl)}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px;">
              <div style="height:1px;background-color:${BORDER};font-size:0;line-height:0;">&nbsp;</div>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 32px 32px 32px;font-family:Helvetica,Arial,sans-serif;">
              <p style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:${MUTED};">
                Questions about your enrolment or which subjects you can see? Contact ${school} directly - they manage your access.
              </p>
            </td>
          </tr>
        </table>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;">
          <tr>
            <td align="center" style="padding:20px 16px;font-family:Helvetica,Arial,sans-serif;">
              <p style="margin:0 0 4px 0;font-size:12px;color:${MUTED};">
                Sent by AviPrep on behalf of ${school}.
              </p>
              <p style="margin:0;font-size:12px;color:${MUTED};">
                You're receiving this because an account was created for you at ${school}.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`
}
