import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { SUBJECTS } from "@lib/subjects"
import { unitsForSubject } from "@lib/mos/subjects"
import { MosSubject } from "./mos-subject"

export async function generateMetadata({ params }: { params: Promise<{ subjectId: string }> }): Promise<Metadata> {
  const { subjectId } = await params
  const subject = SUBJECTS.find((s) => s.id === subjectId)
  return { title: subject ? `${subject.code} MOS coverage` : "MOS coverage" }
}

export default async function MosSubjectPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params
  if (!SUBJECTS.some((s) => s.id === subjectId) || !unitsForSubject(subjectId).length) notFound()
  return <MosSubject subjectId={subjectId} />
}
