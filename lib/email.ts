import nodemailer from "nodemailer"
import { getCustomTemplate } from "./email-templates"

const transporter = nodemailer.createTransport({
    name: "aviprep.com.au",
    host: "smtp-relay.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: "joshua@aviprep.com.au",
        pass: process.env.GMAIL_APP_PASSWORD,
    }
})

interface EmailOptions {
    to: string | string[]
    subject: string
    text?: string
    html: string
}

export async function sendEmailWelcome({ to, subject, text, html }: EmailOptions) {
    try {
        const info = await transporter.sendMail({
            from: '"AviPrep" <welcome@aviprep.com.au>',
            to: Array.isArray(to) ? to.join(", ") : to,
            subject,
            text: text || "",
            html,
        })
        console.log("Email sent:", info.messageId)
        return { success: true, messageId: info.messageId }
    } catch (error) {
        console.error("Email send error:", error)
        throw error
    }
}

export async function sendEmailSupport({ to, subject, text, html }: EmailOptions) {
    try {
        const info = await transporter.sendMail({
            from: '"AviPrep" <support@aviprep.com.au>',
            to: Array.isArray(to) ? to.join(", ") : to,
            subject,
            text: text || "",
            html,
        })
        console.log("Email sent:", info.messageId)
        return { success: true, messageId: info.messageId }
    } catch (error) {
        console.error("Email send error:", error)
        throw error
    }
}

export async function sendBulkEmails(
    recipients: { email: string; firstName?: string }[],
    subject: string,
    html: string,
    personalize: boolean = false
) {
    const results: { email: string; success: boolean; error?: string }[] = []

    for (const recipient of recipients) {
        try {
            let personalizedHtml = getCustomTemplate(html, recipient.email);

            if (personalize && recipient.firstName) {
                personalizedHtml = html.replace(/{{firstName}}/g, recipient.firstName)
            }

            await sendEmailSupport({
                to: recipient.email,
                subject,
                html: personalizedHtml,
            })

            results.push({ email: recipient.email, success: true })

            // Add a small delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 100))
        } catch (error) {
            results.push({
                email: recipient.email,
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            })
        }
    }

    return results
}
