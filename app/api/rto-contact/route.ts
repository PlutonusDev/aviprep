import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { sendEmailPartnership, sendEmailWelcome } from "@lib/email"

export async function POST(request: Request) {
  try {
    const { name, email, phone, organisation, token } = await request.json()

    // Validate required fields
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    if (!organisation || typeof organisation !== "string") {
      return NextResponse.json({ error: "Organisation name is required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Validate reCAPTCHA
    const recaptchaRes = await fetch(
        `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
        { method: "POST" }
    );

    const recaptchaData = await recaptchaRes.json();

    if (!recaptchaData.success || recaptchaData.score < 0.5) {
        return NextResponse.json({ error: "Recaptcha verification failed" }, { status: 400 });
    }

    // Check if this organisation already contacted us
    const existingContact = await prisma.rtoContact.findFirst({
      where: { 
        email: email.toLowerCase()
      },
    })

    if (existingContact) {
      return NextResponse.json({ error: "We've already received your inquiry. Our team will contact you soon." }, { status: 400 })
    }

    // Save RTO contact request
    await prisma.rtoContact.create({
      data: {
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        organisation,
      },
    })

    // Send confirmation email to the RTO contact
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Partnership Inquiry Received</h1>
            </div>
            <div class="content">
              <p>Dear ${name},</p>
              <p>Thank you for your interest in partnering with AviPrep. We've received your inquiry from <strong>${organisation}</strong>.</p>
              <p>Our partnerships team will review your request and contact you within 48 hours to discuss:</p>
              <ul>
                <li>Multi-user institutional licensing</li>
                <li>Student progress tracking and reporting</li>
                <li>Customized pricing for flight training organizations</li>
                <li>Integration options with your existing systems</li>
              </ul>
              <p>If you have any urgent questions in the meantime, please don't hesitate to reach out to us directly at <a href="mailto:partnerships@aviprep.com.au">partnerships@aviprep.com.au</a>.</p>
              <p>We look forward to discussing how AviPrep can support your students' success.</p>
              <p><strong>The AviPrep Team</strong></p>
            </div>
            <div class="footer">
              <p>AviPrep - CASA-Aligned Flight Theory Preparation Platform</p>
              <p>This is an automated message. Please do not reply directly to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `

    // Send confirmation email
    try {
      await sendEmailPartnership({
        to: email.toLowerCase(),
        subject: "AviPrep Partnership Inquiry - Confirmation",
        html: htmlContent
      });
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("RTO contact error:", error)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
