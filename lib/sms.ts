import "server-only"

/**
 * SMS through ClickSend (https://developers.clicksend.com/docs/rest/v3/).
 * Credentials come from the environment - never hard-code the API key.
 */

const ENDPOINT = "https://rest.clicksend.com/v3/sms/send"

/** 0412 345 678 / 61412345678 / +61412345678 -> +61412345678. Null if not an AU mobile. */
export function toE164AustralianMobile(phone: string): string | null {
  const digits = phone.replace(/[^\d+]/g, "")
  const match = digits.match(/^(?:\+?61|0)(4\d{8})$/)
  return match ? `+61${match[1]}` : null
}

/** "•••• ••• 678" - enough to recognise, not enough to harvest. */
export function maskPhone(phone: string): string {
  const e164 = toE164AustralianMobile(phone)
  const last = (e164 ?? phone).replace(/\D/g, "").slice(-3)
  return `•••• ••• ${last}`
}

export async function sendSms(to: string, body: string): Promise<{ ok: boolean }> {
  const recipient = toE164AustralianMobile(to)
  if (!recipient) return { ok: false }

  const username = process.env.CLICKSEND_USERNAME
  const apiKey = process.env.CLICKSEND_API_KEY
  const from = (process.env.CLICKSEND_SENDER || "AviPrep").slice(0, 11)

  if (!username || !apiKey) {
    if (process.env.NODE_ENV !== "production") {
      // Lets the flows be exercised locally without spending credits.
      console.info(`[sms:dev] to ${recipient}\n${body}`)
      return { ok: true }
    }
    console.error("SMS not sent: CLICKSEND_USERNAME / CLICKSEND_API_KEY are not set")
    return { ok: false }
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${apiKey}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: [{ source: "aviprep", from, to: recipient, body }] }),
      signal: AbortSignal.timeout(10_000),
    })
    const data = await res.json().catch(() => null)
    const status = data?.data?.messages?.[0]?.status
    if (!res.ok || data?.response_code !== "SUCCESS" || status !== "SUCCESS") {
      console.error("ClickSend rejected SMS:", res.status, data?.response_code, status)
      return { ok: false }
    }
    return { ok: true }
  } catch (error) {
    console.error("ClickSend request failed:", error)
    return { ok: false }
  }
}
