import Link from "next/link"
import { BookOpen, Plus, UserPlus, Users } from "lucide-react"
import { PageHead, Panel } from "@/components/demo/bits"
import { DEMO_GROUPS, PASS_MARK, attemptsFor, averageOf, membersOf, subjectCode } from "@lib/demo/school"

/** Groups: a class, an intake, or a course, with the subjects it unlocks. */
export default function DemoGroups() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHead
        title="Groups"
        blurb={`${DEMO_GROUPS.length} groups`}
        aside={
          <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New group
          </span>
        }
      />

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DEMO_GROUPS.map((group) => {
          const members = membersOf(group.id)
          const average = averageOf(members.flatMap((m) => attemptsFor(m.id)))
          return (
            <li key={group.id}>
              <div className="flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-e1">
                <div className="flex items-start gap-2">
                  <span aria-hidden="true" className="mt-1.5 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-foreground">{group.name}</h2>
                    <p className="text-sm text-muted-foreground">{group.description}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" aria-hidden="true" />
                    {members.length} students
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    <BookOpen className="h-3 w-3" aria-hidden="true" />
                    {group.subjectIds.length} subjects
                  </span>
                  {average !== null && (
                    <span
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
                        average >= PASS_MARK ? "bg-success/15 text-success" : "bg-warning/15 text-foreground"
                      }`}
                      data-tabular
                    >
                      {average}% average
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">{group.subjectIds.map(subjectCode).join(", ")}</p>

                <div className="grid grid-cols-2 gap-2">
                  <span className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground">
                    <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                    Students
                  </span>
                  <span className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground">
                    <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                    Subjects
                  </span>
                </div>

                <ul className="mt-auto space-y-0.5 text-sm text-muted-foreground">
                  {members.slice(0, 4).map((m) => (
                    <li key={m.id} className="truncate">
                      <Link href={`/demo/students/${m.id}`} className="hover:text-foreground hover:underline">
                        {m.firstName} {m.lastName}
                      </Link>
                    </li>
                  ))}
                  {members.length > 4 && <li className="text-xs">+{members.length - 4} more</li>}
                </ul>
              </div>
            </li>
          )
        })}
      </ul>

    </div>
  )
}
