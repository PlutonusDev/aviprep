import { KeyRound, Webhook } from "lucide-react"
import { PageHead, Panel } from "@/components/demo/bits"

/** For schools whose own system is the source of truth. */

const ENDPOINTS = [
  { method: "GET", path: "/students", desc: "List your students" },
  { method: "POST", path: "/students", desc: "Enrol one" },
  { method: "GET", path: "/students/:id", desc: "One student's details" },
  { method: "GET", path: "/students/:id/progress", desc: "Their progress" },
  { method: "GET", path: "/students/:id/exams", desc: "Their exam history" },
  { method: "DELETE", path: "/students/:id", desc: "Take them off the school" },
  { method: "GET", path: "/progress", desc: "Progress across the school" },
  { method: "GET", path: "/analytics", desc: "School analytics" },
]

const METHOD_TONE: Record<string, string> = {
  GET: "bg-muted text-muted-foreground",
  POST: "bg-primary/15 text-primary",
  DELETE: "bg-destructive/10 text-destructive",
}

export default function DemoApi() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHead title="API" blurb="https://aviprep.com.au/api/v1" />

      <div className="space-y-6">
        <Panel title="Your key" description="Rotate it whenever you like.">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <code className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">avp_live_••••••••••••••••••••••••7f2a</code>
            <span className="shrink-0 text-sm text-muted-foreground">Copy</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Send it as <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">Authorization: Bearer &lt;key&gt;</code>.
          </p>
        </Panel>

        <Panel title="Endpoints">
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="border-b border-border bg-muted px-4 py-2">
              <code className="text-sm text-foreground">https://aviprep.com.au/api/v1</code>
            </div>
            <ul className="divide-y divide-border">
              {ENDPOINTS.map((e) => (
                <li key={e.method + e.path} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <span className={`w-16 shrink-0 rounded px-2 py-0.5 text-center text-xs font-semibold ${METHOD_TONE[e.method]}`}>{e.method}</span>
                  <code className="min-w-0 flex-1 truncate text-sm text-foreground">{e.path}</code>
                  <span className="text-sm text-muted-foreground">{e.desc}</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <Panel title="Webhooks" description="We post to your system when something happens here.">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <Webhook className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <code className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">https://windsock.example.com/hooks/aviprep</code>
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {["student.enrolled", "student.removed", "exam.completed", "subject.granted"].map((event) => (
              <li key={event}>
                <code className="rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">{event}</code>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">Every request is signed with a shared secret.</p>
        </Panel>
      </div>
    </div>
  )
}
