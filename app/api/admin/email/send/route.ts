import { NextResponse } from "next/server"
import { verifyAdmin } from "app/api/admin/middleware"
import { prisma } from "@lib/prisma"
import { sendEmailSupport, sendBulkEmails } from "@lib/email"
import { getCustomTemplate } from "@lib/email-templates"

export async function POST(request: Request) {
  const adminCheck = await verifyAdmin()
  if ("error" in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
  }

  try {
    const body = await request.json()
    const { 
      subject, 
      html, 
      recipients, // "all_users" | "all_waitlist" | "specific"
      specificEmails, // array of emails for "specific"
      personalize, // whether to replace {{firstName}}
      useWrapper, // whether to wrap in AviPrep template
    } = body

    if (!subject || !html) {
      return NextResponse.json({ error: "Subject and HTML content are required" }, { status: 400 })
    }

    let recipientList: { email: string; firstName?: string }[] = []

    if (recipients === "all_users") {
      const users = await prisma.user.findMany({
        select: { email: true, firstName: true },
      })
      recipientList = users.map((u) => ({ email: u.email, firstName: u.firstName }))
    } else if (recipients === "all_waitlist") {
      const waitlist = await prisma.waitlist.findMany({
        select: { email: true },
      })
      recipientList = waitlist.map((w) => ({ email: w.email }))
    } else if (recipients === "specific" && specificEmails?.length > 0) {
      recipientList = specificEmails.map((email: string) => ({ email }))
    } else {
      return NextResponse.json({ error: "Invalid recipients" }, { status: 400 })
    }

    if (recipientList.length === 0) {
      return NextResponse.json({ error: "No recipients found" }, { status: 400 })
    }

    // For a single recipient, send directly
    if (recipientList.length === 1) {
      const finalHtml = useWrapper ? getCustomTemplate(html, recipientList[0].email) : html
      let personalizedHtml = finalHtml
      if (personalize && recipientList[0].firstName) {
        personalizedHtml = finalHtml.replace(/{{firstName}}/g, recipientList[0].firstName)
      }
      
      await sendEmailSupport({
        to: recipientList[0].email,
        subject,
        html: personalizedHtml,
      })

      return NextResponse.json({ 
        success: true, 
        sent: 1, 
        failed: 0,
        results: [{ email: recipientList[0].email, success: true }]
      })
    }

    // For bulk emails
    const results = await sendBulkEmails(recipientList, subject, html, personalize)
    
    const sent = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    return NextResponse.json({ 
      success: true, 
      sent, 
      failed,
      results,
    })
  } catch (error) {
    console.error("Email send error:", error)
    return NextResponse.json({ error: "Failed to send emails" }, { status: 500 })
  }
}
