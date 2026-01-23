import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@lib/prisma"
import { verifyToken, hashPassword, isValidAustralianPhone, isValidARN } from "@lib/auth"
import { sendEmailWelcome } from "@lib/email"
import { getCustomTemplate } from "@lib/email-templates"
import { stripe } from "@lib/stripe";

async function getSchoolForAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isFlightSchoolAdmin: true },
  })

  if (!user?.isFlightSchoolAdmin) return null

  return prisma.flightSchool.findUnique({
    where: { adminId: userId },
    select: { id: true, name: true, maxStudents: true },
  })
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const school = await getSchoolForAdmin(payload.userId)
    if (!school) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
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
          profilePicture: true,
          enrolledAt: true,
          examAttempts: {
            orderBy: { completedAt: "desc" },
            take: 1,
            select: { score: true, completedAt: true },
          },
          _count: { select: { examAttempts: true } },
        },
        orderBy: { enrolledAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    // Get average scores for all students
    const studentIds = students.map((s) => s.id)
    const avgScores = await prisma.examAttempt.groupBy({
      by: ["userId"],
      where: { userId: { in: studentIds } },
      _avg: { score: true },
    })
    const avgScoreMap = new Map(avgScores.map((s) => [s.userId, Math.round(s._avg.score || 0)]))

    return NextResponse.json({
      students: students.map((s) => ({
        id: s.id,
        email: s.email,
        firstName: s.firstName,
        lastName: s.lastName,
        arn: s.arn,
        profilePicture: s.profilePicture,
        enrolledAt: s.enrolledAt,
        examCount: s._count.examAttempts,
        averageScore: s._count.examAttempts > 0 ? avgScoreMap.get(s.id) || null : null,
        lastActive: s.examAttempts[0]?.completedAt || null,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("Get students error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const school = await getSchoolForAdmin(payload.userId)
    if (!school) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    // Check student limit
    const currentCount = await prisma.user.count({
      where: { flightSchoolId: school.id },
    })

    if (currentCount >= school.maxStudents) {
      return NextResponse.json(
        { error: "Student limit reached. Please upgrade your plan." },
        { status: 400 }
      )
    }

    const { email, firstName, lastName, phone, arn } = await request.json()

    // Validate inputs
    if (!email || !firstName || !lastName || !phone || !arn) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
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
      // If user exists and not in a school, add them
      if (!existingUser.flightSchoolId) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { flightSchoolId: school.id, enrolledAt: new Date() },
        })

        const html = `<p>Hi ${existingUser.firstName},</p><p>You have been enrolled in ${school.name} on AviPrep.</p>`

        // Send notification email
        sendEmailWelcome({
          to: existingUser.email,
          subject: `You've been added to ${school.name}`,
          html: getCustomTemplate(html, existingUser.email),
        }).catch(console.error)

        return NextResponse.json({ success: true, userId: existingUser.id })
      } else {
        return NextResponse.json(
          { error: "This user is already enrolled in a flight school" },
          { status: 400 }
        )
      }
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

    // Create new user with temporary password
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
        stripeCustomerId: stripeCustomer.id,
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

    // Send welcome email with temporary password
    sendEmailWelcome({
      to: newUser.email,
      subject: `Welcome to AviPrep - ${school.name}`,
      html: getCustomTemplate(html, newUser.email),
    }).catch(console.error)

    return NextResponse.json({ success: true, userId: newUser.id })
  } catch (error) {
    console.error("Add student error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
