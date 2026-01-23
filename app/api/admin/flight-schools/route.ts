import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@lib/prisma"
import { verifyToken } from "@lib/auth"
import { sendEmailPartnership } from "@lib/email"
import { getCustomTemplate } from "@lib/email-templates"

async function verifyAdmin(token: string) {
  const payload = await verifyToken(token)
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, isAdmin: true },
  })

  return user?.isAdmin ? user : null
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = await verifyAdmin(token)
    if (!admin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ]
    }

    const schools = await prisma.flightSchool.findMany({
      where,
      include: {
        admin: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: { students: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      schools: schools.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        email: s.email,
        phone: s.phone,
        city: s.city,
        state: s.state,
        logo: s.logo,
        isActive: s.isActive,
        maxStudents: s.maxStudents,
        subscriptionTier: s.subscriptionTier,
        subscriptionExpiry: s.subscriptionExpiry,
        studentCount: s._count.students,
        adminName: `${s.admin.firstName} ${s.admin.lastName}`,
        adminEmail: s.admin.email,
        createdAt: s.createdAt,
      })),
    })
  } catch (error) {
    console.error("Get flight schools error:", error)
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

    const admin = await verifyAdmin(token)
    if (!admin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    const { name, email, adminEmail, subscriptionTier, maxStudents } = await request.json()

    if (!name || !email || !adminEmail) {
      return NextResponse.json({ error: "Name, email, and admin email are required" }, { status: 400 })
    }

    // Find the admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: adminEmail.toLowerCase() },
    })

    if (!adminUser) {
      return NextResponse.json(
        { error: "Admin user not found. They must have an AviPrep account first." },
        { status: 400 }
      )
    }

    if (adminUser.isFlightSchoolAdmin) {
      return NextResponse.json(
        { error: "This user is already an admin for another flight school" },
        { status: 400 }
      )
    }

    // Check if school email already exists
    const existingSchool = await prisma.flightSchool.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingSchool) {
      return NextResponse.json({ error: "A school with this email already exists" }, { status: 400 })
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

    // Create the flight school
    const school = await prisma.flightSchool.create({
      data: {
        name,
        slug,
        email: email.toLowerCase(),
        adminId: adminUser.id,
        subscriptionTier: subscriptionTier || "basic",
        maxStudents: maxStudents || 50,
      },
    })

    // Update the admin user
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { isFlightSchoolAdmin: true },
    })

    const html = `
        <p>Hi ${adminUser.firstName},</p>
        <p>You have been assigned as the administrator for <strong>${name}</strong> on AviPrep.</p>
        <p>You can access your flight school dashboard at: <a href="https://aviprep.com.au/school">aviprep.com.au/school</a></p>
        <p>From there, you can:</p>
        <ul>
          <li>Add and manage students</li>
          <li>Track student progress</li>
          <li>Configure API integrations</li>
          <li>And more!</li>
        </ul>
        <p>Welcome aboard!</p>
      `

    // Send notification email
    sendEmailPartnership({
      to: adminUser.email,
      subject: `${name} on AviPrep`,
      html: getCustomTemplate(html, adminUser.email),
    }).catch(console.error)

    return NextResponse.json({ success: true, schoolId: school.id })
  } catch (error) {
    console.error("Create flight school error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
