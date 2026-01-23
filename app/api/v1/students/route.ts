import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { hashPassword, isValidAustralianPhone, isValidARN } from "@lib/auth"
import { sendEmailWelcome } from "@lib/email"
import { getCustomTemplate } from "@lib/email-templates"

async function authenticateApiKey(request: Request) {
  const authHeader = request.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }

  const apiKey = authHeader.slice(7)
  const school = await prisma.flightSchool.findUnique({
    where: { apiKey },
    select: {
      id: true,
      name: true,
      apiEnabled: true,
      maxStudents: true,
    },
  })

  if (!school || !school.apiEnabled) {
    return null
  }

  return school
}

export async function GET(request: Request) {
  try {
    const school = await authenticateApiKey(request)
    if (!school) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
    const search = searchParams.get("search") || ""

    const where: Record<string, unknown> = { flightSchoolId: school.id }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { arn: { contains: search, mode: "insensitive" } },
      ]
    }

    const [students, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          arn: true,
          enrolledAt: true,
          _count: { select: { examAttempts: true } },
        },
        orderBy: { enrolledAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({
      students: students.map((s) => ({
        id: s.id,
        email: s.email,
        firstName: s.firstName,
        lastName: s.lastName,
        arn: s.arn,
        enrolledAt: s.enrolledAt,
        examCount: s._count.examAttempts,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("API list students error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const school = await authenticateApiKey(request)
    if (!school) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check student limit
    const currentCount = await prisma.user.count({
      where: { flightSchoolId: school.id },
    })

    if (currentCount >= school.maxStudents) {
      return NextResponse.json(
        { error: "Student limit reached" },
        { status: 400 }
      )
    }

    const { email, firstName, lastName, phone, arn } = await request.json()

    // Validate inputs
    if (!email || !firstName || !lastName || !phone || !arn) {
      return NextResponse.json(
        { error: "Missing required fields: email, firstName, lastName, phone, arn" },
        { status: 400 }
      )
    }

    if (!isValidAustralianPhone(phone)) {
      return NextResponse.json({ error: "Invalid Australian phone number" }, { status: 400 })
    }

    if (!isValidARN(arn)) {
      return NextResponse.json({ error: "Invalid ARN format" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: email.toLowerCase() }, { arn }] },
    })

    if (existingUser) {
      if (!existingUser.flightSchoolId) {
        // Add existing user to school
        const updated = await prisma.user.update({
          where: { id: existingUser.id },
          data: { flightSchoolId: school.id, enrolledAt: new Date() },
        })

        return NextResponse.json({
          id: updated.id,
          email: updated.email,
          firstName: updated.firstName,
          lastName: updated.lastName,
          arn: updated.arn,
          enrolledAt: updated.enrolledAt,
          isNew: false,
        })
      } else {
        return NextResponse.json(
          { error: "User already enrolled in a flight school" },
          { status: 400 }
        )
      }
    }

    // Create new user
    const tempPassword = Math.random().toString(36).slice(-10)
    const passwordHash = await hashPassword(tempPassword)

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        firstName,
        lastName,
        phone,
        arn,
        passwordHash,
        flightSchoolId: school.id,
        enrolledAt: new Date(),
      },
    })

    const html = `
        <p>Hi ${firstName},</p>
        <p>You have been enrolled in ${school.name} on AviPrep.</p>
        <p>Your temporary login credentials:</p>
        <ul>
          <li>Email: ${email}</li>
          <li>Password: <strong>${tempPassword}</strong></li>
        </ul>
        <p>Please log in and change your password immediately.</p>
      `

    // Send welcome email
    sendEmailWelcome({
      to: newUser.email,
      subject: `Welcome to AviPrep - ${school.name}`,
      html: getCustomTemplate(html, newUser.email),
    }).catch(console.error)

    return NextResponse.json({
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      arn: newUser.arn,
      enrolledAt: newUser.enrolledAt,
      isNew: true,
      temporaryPassword: tempPassword,
    }, { status: 201 })
  } catch (error) {
    console.error("API add student error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
