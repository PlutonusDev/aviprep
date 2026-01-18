import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { sendEmailWelcome } from "@lib/email"
import { getWaitlistTemplate } from "@lib/email-templates"

export async function POST(request: Request) {
  try {
    const { email, token } = await request.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    const recaptchaRes = await fetch(
        `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
        { method: "POST" }
    );

    const recaptchaData = await recaptchaRes.json();

    if (!recaptchaData.success || recaptchaData.score < 0.5) {
        return NextResponse.json({ error: "Recaptcha verification failed" }, { status: 400 });
    }

    // Check if email already exists
    const existingEntry = await prisma.waitlist.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingEntry) {
      return NextResponse.json({ error: "This email is already on the waitlist" }, { status: 400 })
    }

    // Add to waitlist
    await prisma.waitlist.create({
      data: {
        email: email.toLowerCase(),
      },
    })

    sendEmailWelcome({
      to: email.toLowerCase(),
      subject: "AviPrep Waitlist",
      html: getWaitlistTemplate(email.toLowerCase())
    });

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Waitlist signup error:", error)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
