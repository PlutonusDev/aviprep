import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@lib/prisma"
import { hashPassword, createSession, isValidAustralianPhone, isValidARN } from "@lib/auth"
import { stripe } from "@lib/stripe";

export async function POST(request: Request) {
  try {
    return NextResponse.json({ error: "New registrations are disabled" });

    const body = await request.json()
    const { email, password, firstName, lastName, phone, arn } = body

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !phone || !arn) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    // Validate Australian phone number
    if (!isValidAustralianPhone(phone)) {
      return NextResponse.json({ error: "Invalid Australian mobile number. Use format: 04XX XXX XXX" }, { status: 400 })
    }

    // Validate ARN
    if (!isValidARN(arn)) {
      return NextResponse.json({ error: "Invalid ARN. Must be a 6- or 7-digit number" }, { status: 400 })
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingEmail) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 })
    }

    // Check if ARN already exists
    const existingArn = await prisma.user.findUnique({
      where: { arn },
    })

    if (existingArn) {
      return NextResponse.json({ error: "An account with this ARN already exists" }, { status: 400 })
    }

    const stripeCustomer = await stripe.customers.create({
      email: email.toLowerCase(),
      name: `${firstName} ${lastName}`,
      phone: phone,
      metadata: {
        arn: arn,
        source: "aviprep",
      },
    });

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        phone,
        arn,
        stripeCustomerId: stripeCustomer.id,
      },
    })

    // Create session
    const token = await createSession({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      arn: user.arn,
    })

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "An error occurred during registration" }, { status: 500 })
  }
}
