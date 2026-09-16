import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { isResponse, requireStaff } from "@lib/staff"
import { ITEM_SUMMARY_SELECT, subjectUnits } from "@lib/mos/library"

export const dynamic = "force-dynamic"

/**
 * Manual search within a subject's units. Accepts a reference ("2.1.1",
 * "CADA 2.1", "2.1.1(a)") or words from the requirement.
 */
export async function GET(request: NextRequest) {
  const staff = await requireStaff({ curators: true })
  if (isResponse(staff)) return staff

  const subjectId = request.nextUrl.searchParams.get("subjectId") ?? ""
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 120)
  const resolved = await subjectUnits(subjectId)
  const units = resolved.map((u) => u.number)
  if (!units.length) return NextResponse.json({ items: [] })

  // Specific items by id (deep links from the coverage page).
  const ids = (request.nextUrl.searchParams.get("ids") ?? "").split(",").filter((x) => /^[a-f0-9]{24}$/i.test(x)).slice(0, 20)
  if (ids.length) {
    const items = await prisma.mosItem.findMany({ where: { id: { in: ids }, unitNumber: { in: units } }, select: ITEM_SUMMARY_SELECT })
    return NextResponse.json({ items })
  }

  if (q.length < 2) return NextResponse.json({ items: [] })

  // An optional unit code prefix, "CADA 2.1", recognised only if it's one of this subject's units.
  const first = q.split(/\s+/)[0].toUpperCase()
  const code = resolved.some((u) => u.code === first) ? first : null
  const rest = (code ? q.slice(first.length) : q).trim()
  const isRef = /^\d+(\.\d+){0,2}(\([a-z]{1,2}\))?$/i.test(rest)

  const where = {
    unitNumber: { in: units },
    OR: [{ retired: false }, { retired: null }, { retired: { isSet: false } }],
    ...(code ? { unitCode: code } : {}),
    ...(isRef
      ? { ref: { startsWith: rest.toLowerCase() } }
      : rest
        ? { AND: rest.split(/\s+/).filter(Boolean).slice(0, 6).map((word) => ({ fullText: { contains: word, mode: "insensitive" as const } })) }
        : {}),
  }

  const items = await prisma.mosItem.findMany({ where, select: { ...ITEM_SUMMARY_SELECT, order: true }, take: 25 })
  items.sort((a, b) => units.indexOf(a.unitNumber) - units.indexOf(b.unitNumber) || a.order - b.order)
  return NextResponse.json({ items: items.map(({ order: _order, ...item }) => item) })
}
