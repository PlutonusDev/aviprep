import { NextResponse } from "next/server"
import { getSession } from "@lib/auth"
import { prisma } from "@lib/prisma"
import { LICENSE_TYPES, SUBJECTS } from "@lib/subjects"
import { getPublishedCountsBySubject } from "@lib/question-counts"

/** How long the free subject stays unlocked. */
const FREE_SUBJECT_MONTHS = 12

/**
 * The one subject a new member unlocks free.
 *   GET            -> whether they can still choose, and the subjects on offer
 *   POST {subjectId} -> unlocks it: lessons, exams and every feature
 */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [user, questionCounts, courses] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.id },
      select: { freeSubjectEligible: true, freeSubjectId: true, purchases: { select: { subjectId: true, expiresAt: true } } },
    }),
    getPublishedCountsBySubject(),
    prisma.course.findMany({ where: { isPublished: true }, select: { subjectId: true } }),
  ])
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const owned = new Set(user.purchases.filter((p) => p.expiresAt > new Date()).map((p) => p.subjectId))
  const withCourse = new Set(courses.map((c) => c.subjectId))
  const available = new Set(LICENSE_TYPES.filter((l) => l.available).map((l) => l.id))

  const subjects = SUBJECTS.filter((s) => !s.comingSoon && available.has(s.licenseType)).map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    licenseType: s.licenseType,
    description: s.description,
    icon: s.icon,
    questionCount: questionCounts[s.id] ?? 0,
    hasLessons: withCourse.has(s.id),
    owned: owned.has(s.id),
  }))

  return NextResponse.json({
    canClaim: user.freeSubjectEligible === true && !user.freeSubjectId,
    claimedSubjectId: user.freeSubjectId,
    months: FREE_SUBJECT_MONTHS,
    licenses: LICENSE_TYPES.filter((l) => l.available).map((l) => ({ id: l.id, name: l.name, fullName: l.fullName })),
    subjects,
  })
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { subjectId } = await request.json().catch(() => ({}))
    const subject = SUBJECTS.find((s) => s.id === subjectId && !s.comingSoon)
    const license = subject && LICENSE_TYPES.find((l) => l.id === subject.licenseType)
    if (!subject || !license?.available) {
      return NextResponse.json({ error: "Pick a subject from the list." }, { status: 400 })
    }

    // Claim atomically: the conditional update only matches while the choice is
    // still open, so two quick clicks (or two tabs) can't unlock two subjects.
    const claimed = await prisma.user.updateMany({
      where: {
        id: session.id,
        freeSubjectEligible: true,
        // On MongoDB `null` doesn't match a field that was never written, so check both.
        OR: [{ freeSubjectId: null }, { freeSubjectId: { isSet: false } }],
      },
      data: { freeSubjectId: subject.id, freeSubjectEligible: false },
    })
    if (claimed.count === 0) {
      return NextResponse.json({ error: "You've already chosen your free subject." }, { status: 409 })
    }

    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + FREE_SUBJECT_MONTHS)

    try {
      await prisma.purchase.upsert({
        where: { userId_subjectId: { userId: session.id, subjectId: subject.id } },
        create: {
          userId: session.id,
          subjectId: subject.id,
          subjectName: subject.name,
          subjectCode: subject.code,
          purchaseType: "free",
          priceAud: 0,
          // Everything a paid subject includes.
          hasPrinting: true,
          hasAiInsights: true,
          expiresAt,
          stripePaymentId: "free_subject",
        },
        // Already had it (unusual for a new member): extend rather than shorten.
        update: { hasPrinting: true, hasAiInsights: true, expiresAt },
      })
    } catch (error) {
      // Give the choice back so they aren't left with nothing.
      await prisma.user.update({
        where: { id: session.id },
        data: { freeSubjectId: null, freeSubjectEligible: true },
      })
      throw error
    }

    return NextResponse.json({ subjectId: subject.id, subjectName: subject.name, expiresAt })
  } catch (error) {
    console.error("Free subject claim error:", error)
    return NextResponse.json({ error: "Couldn't unlock that subject. Try again." }, { status: 500 })
  }
}
