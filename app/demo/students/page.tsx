import Link from "next/link"
import { ArrowRight, Search, UserPlus } from "lucide-react"
import { Initials, PageHead, Panel } from "@/components/demo/bits"
import { DEMO_SCHOOL, PASS_MARK, groupById, rosterByGroup, studentSummary, subjectCode } from "@lib/demo/school"

/** The roster, ordered by group the way the real table orders it. */
export default function DemoStudents() {
  const sections: { key: string; name: string; color: string | null; students: typeof rosterByGroup }[] = []
  for (const student of rosterByGroup) {
    const group = groupById(student.groupId)
    const key = group?.id ?? "__none"
    const last = sections[sections.length - 1]
    if (last?.key === key) last.students.push(student)
    else sections.push({ key, name: group?.name ?? "No group", color: group?.color ?? null, students: [student] })
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHead
        title="Students"
        blurb="Everyone at the school, filed under their group. Add them one at a time, or hand us a CSV and we'll load the intake."
        aside={
          <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Add a student
          </span>
        }
      />

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-muted-foreground shadow-e1">
        <Search className="h-4 w-4" aria-hidden="true" />
        Search by name, email or ARN
      </div>

      <Panel>
        <div className="-mx-5 -my-5 overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <caption className="sr-only">Students at {DEMO_SCHOOL.name}, grouped by class</caption>
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-5 py-3 font-medium">
                  Student
                </th>
                <th scope="col" className="px-3 py-3 font-medium">
                  ARN
                </th>
                <th scope="col" className="px-3 py-3 text-center font-medium">
                  Exams
                </th>
                <th scope="col" className="px-3 py-3 text-center font-medium">
                  Average
                </th>
                <th scope="col" className="px-3 py-3 font-medium">
                  Subjects
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Last active
                </th>
              </tr>
            </thead>
            {sections.map((section) => (
              <tbody key={section.key}>
                <tr>
                  <th scope="colgroup" colSpan={6} className="bg-muted/40 px-5 py-1.5 text-left">
                    <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {section.color && <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: section.color }} />}
                      {section.name}
                      <span className="font-normal normal-case tracking-normal">{section.students.length} students</span>
                    </span>
                  </th>
                </tr>
                {section.students.map((student) => {
                  const summary = studentSummary(student)
                  return (
                    <tr key={student.id} className="border-b border-border last:border-b-0 hover:bg-muted/40">
                      <td className="px-5 py-2.5">
                        <Link href={`/demo/students/${student.id}`} className="flex items-center gap-3 hover:underline">
                          <Initials first={student.firstName} last={student.lastName} className="h-8 w-8" />
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-foreground">
                              {student.firstName} {student.lastName}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">{student.email}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{student.arn}</td>
                      <td className="px-3 py-2.5 text-center text-muted-foreground" data-tabular>
                        {summary.examCount}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {summary.averageScore !== null ? (
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-semibold ${
                              summary.averageScore >= PASS_MARK ? "bg-success/15 text-success" : "bg-warning/15 text-foreground"
                            }`}
                            data-tabular
                          >
                            {summary.averageScore}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{student.subjectIds.map(subjectCode).join(", ")}</td>
                      <td className="px-5 py-2.5 text-xs text-muted-foreground">
                        {student.lastSeenDays === 0 ? (
                          "Today"
                        ) : summary.stalled ? (
                          <span className="rounded bg-warning/15 px-1.5 py-px text-foreground">{student.lastSeenDays} days ago</span>
                        ) : (
                          `${student.lastSeenDays} days ago`
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            ))}
          </table>
        </div>
      </Panel>

      <p className="mt-4 text-sm text-muted-foreground">
        Tick a few and file them into a group in one go, or open anyone to see{" "}
        <Link href={`/demo/students/${rosterByGroup[0].id}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          their progress
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </p>
    </div>
  )
}
