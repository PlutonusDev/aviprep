import { cookies } from "next/headers"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { SignJWT, jwtVerify } from "jose"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-min-32-chars-long!")

export interface SessionUser {
  id: string
  email: string
  firstName: string
  lastName: string
  arn: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export async function createSession(user: SessionUser): Promise<string> {
  const token = await new SignJWT({
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    arn: user.arn,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET)

  return token
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("session")?.value

  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      id: payload.userId as string,
      email: payload.email as string,
      firstName: payload.firstName as string,
      lastName: payload.lastName as string,
      arn: payload.arn as string,
    }
  } catch {
    return null
  }
}

export async function verifyToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      userId: payload.userId as string,
      email: payload.email as string,
    }
  } catch {
    return null
  }
}

export async function getUserWithPurchases(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      purchases: true,
      examAttempts: {
        orderBy: { completedAt: "desc" },
        take: 10,
      },
      weakPoints: {
        orderBy: { priority: "asc" },
      },
    },
  })
}

export async function getUserStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      examAttempts: true,
      studySessions: true,
    },
  })

  if (!user) return null

  const totalExamsTaken = user.examAttempts.length
  const totalCorrect = user.examAttempts.reduce((sum, e) => sum + e.correctAnswers, 0)
  const totalQuestions = user.examAttempts.reduce((sum, e) => sum + e.totalQuestions, 0)
  const averageScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0
  const totalStudyHours = Math.round(user.studySessions.reduce((sum, s) => sum + s.durationMins, 0) / 60)

  // Calculate study streak
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let streak = 0
  const checkDate = new Date(today)

  while (true) {
    const hasActivity =
      user.examAttempts.some((e) => {
        const attemptDate = new Date(e.completedAt)
        attemptDate.setHours(0, 0, 0, 0)
        return attemptDate.getTime() === checkDate.getTime()
      }) ||
      user.studySessions.some((s) => {
        const sessionDate = new Date(s.startedAt)
        sessionDate.setHours(0, 0, 0, 0)
        return sessionDate.getTime() === checkDate.getTime()
      })

    if (hasActivity) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  return {
    totalExamsTaken,
    averageScore,
    studyStreak: streak,
    totalStudyHours,
    questionsAnswered: totalQuestions,
    correctAnswers: totalCorrect,
  }
}

export function isValidAustralianPhone(phone: string): boolean {
  // Australian phone: 04XX XXX XXX or +614XX XXX XXX
  const cleaned = phone.replace(/\s/g, "")
  return /^(\+?61|0)4\d{8}$/.test(cleaned)
}

export function isValidARN(arn: string): boolean {
  // ARN format: 6- or 7-digit number
  return /^\d{6,7}$/.test(arn)
}
