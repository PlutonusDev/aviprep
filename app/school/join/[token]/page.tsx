import Link from "next/link"
import { Building2 } from "lucide-react"
import { getSession } from "@lib/auth"
import { prisma } from "@lib/prisma"
import { INVITE_UNAVAILABLE, findInvite } from "@lib/school/invites"
import { JoinForm } from "./join-form"

/**
 * Where an instructor invite lands. Outside the school panel's own gate (see
 * app/school/layout.tsx), because nobody following this link has access yet.
 */

export const dynamic = "force-dynamic"

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-e1 sm:p-8">{children}</div>
    </main>
  )
}

function Dead({ title, body }: { title: string; body: string }) {
  return (
    <Shell>
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <Link href="/login" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
        Go to sign in
      </Link>
    </Shell>
  )
}

export default async function SchoolJoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const found = await findInvite(token)

  if (!found) {
    return <Dead title="This link doesn't work" body="It may have been mistyped or already replaced by a newer invite. Ask the school to send another one." />
  }
  if (found.status !== "pending") {
    return <Dead title="This invite is closed" body={INVITE_UNAVAILABLE[found.status]} />
  }

  const { invite } = found
  const school = await prisma.flightSchool.findUnique({
    where: { id: invite.flightSchoolId },
    select: { name: true, logo: true, isActive: true },
  })
  if (!school?.isActive) {
    return <Dead title="This school isn't active" body="Its AviPrep account has been closed or suspended. Get in touch with the school." />
  }

  const [inviter, existing, session] = await Promise.all([
    prisma.user.findUnique({ where: { id: invite.invitedById }, select: { firstName: true, lastName: true } }),
    prisma.user.findUnique({ where: { email: invite.email }, select: { id: true } }),
    getSession(),
  ])

  return (
    <Shell>
      <div className="flex items-center gap-3">
        {school.logo ? (
          <img src={school.logo} alt="" className="h-11 w-11 shrink-0 rounded-lg object-contain" />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Instructor invite</p>
          <h1 className="truncate text-lg font-semibold text-foreground">{school.name}</h1>
        </div>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
        {inviter ? `${inviter.firstName} ${inviter.lastName}`.trim() : "Someone at the school"} invited{" "}
        <span className="font-medium text-foreground">{invite.email}</span> to help run {school.name} on AviPrep.
      </p>

      {invite.note && (
        <p className="mt-4 rounded-lg border-l-2 border-primary bg-muted/50 px-4 py-3 text-sm leading-relaxed text-foreground">{invite.note}</p>
      )}

      <JoinForm
        token={token}
        email={invite.email}
        firstName={invite.firstName}
        lastName={invite.lastName}
        hasAccount={!!existing}
        signedInAs={session?.email ?? null}
      />
    </Shell>
  )
}
