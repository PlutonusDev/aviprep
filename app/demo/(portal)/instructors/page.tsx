import { Mail, UserPlus } from "lucide-react"
import { Initials, PageHead, Panel } from "@/components/demo/bits"
import { DEMO_INSTRUCTORS, DEMO_INVITES, DEMO_SCHOOL } from "@lib/demo/school"

/** More than one person runs a school, so more than one can get in. */
export default function DemoInstructors() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHead
        title="Instructors"
        blurb={`${DEMO_INSTRUCTORS.length} with access, ${DEMO_INVITES.length} invited`}
        aside={
          <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Invite an instructor
          </span>
        }
      />

      <div className="space-y-6">
        <Panel title="With access" description={`${DEMO_INSTRUCTORS.length} people`}>
          <ul className="divide-y divide-border">
            {DEMO_INSTRUCTORS.map((person) => (
              <li key={person.id} className="flex items-center gap-3 py-3">
                <Initials first={person.firstName} last={person.lastName} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                    <span className="truncate">
                      {person.firstName} {person.lastName}
                    </span>
                    {person.isOwner && (
                      <span className="rounded border border-primary/30 bg-primary/10 px-1.5 text-[10px] font-semibold uppercase tracking-wide">Owner</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {person.role} · {person.email}
                  </p>
                </div>
                {!person.isOwner && <span className="shrink-0 text-sm text-muted-foreground">Remove</span>}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Invited">
          <ul className="divide-y divide-border">
            {DEMO_INVITES.map((invite) => (
              <li key={invite.email} className="flex items-center gap-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Sent {invite.sentDaysAgo} days ago by {invite.invitedBy}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

      </div>
    </div>
  )
}
