import { Mail, UserPlus } from "lucide-react"
import { Initials, PageHead, Panel } from "@/components/demo/bits"
import { DEMO_INSTRUCTORS, DEMO_INVITES, DEMO_SCHOOL } from "@lib/demo/school"

/** More than one person runs a school, so more than one can get in. */
export default function DemoInstructors() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHead
        title="Instructors"
        blurb={`Everyone here can manage ${DEMO_SCHOOL.name} — its students, groups and subjects. Any of them can invite another.`}
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

        <Panel title="Waiting to accept" description="Invites that haven't been used yet.">
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

        <Panel title="How it works">
          <ol className="space-y-4">
            {[
              { n: 1, title: "Send the invite", body: "An email address and, if you like, a note. The link works for two weeks." },
              { n: 2, title: "They accept", body: "Already have an AviPrep account? One button. If not, they set a password on the way in." },
              { n: 3, title: "Same access as you", body: "Students, groups, subjects and progress. Only the owner can remove someone, and anyone can show themselves out." },
            ].map((step) => (
              <li key={step.n} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {step.n}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{step.title}</span>
                  <span className="block text-sm leading-relaxed text-muted-foreground">{step.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  )
}
